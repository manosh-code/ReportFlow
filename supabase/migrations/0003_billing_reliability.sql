-- One durable Checkout operation per organization. Only the billing functions
-- may access its frozen Stripe request parameters.
create table public.billing_checkout_attempts (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  plan text not null check (plan in ('agency', 'enterprise')),
  price_id text not null,
  origin text not null,
  customer_email text,
  customer_name text not null,
  initiated_by uuid not null,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  session_id text unique
);

alter table public.billing_checkout_attempts enable row level security;
revoke all on public.billing_checkout_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.billing_checkout_attempts to service_role;

create function public.reserve_billing_checkout(
  p_org uuid, p_plan text, p_price text, p_origin text, p_email text,
  p_name text, p_user uuid, p_replace uuid default null
) returns jsonb language plpgsql set search_path = '' as $$
declare
  sub public.subscriptions;
  attempt public.billing_checkout_attempts;
begin
  select * into strict sub from public.subscriptions where organization_id = p_org for update;
  if sub.stripe_subscription_id is not null and sub.status <> 'canceled' then
    return jsonb_build_object('blocked', true);
  end if;
  -- The caller has confirmed the old session expired, or that its exact
  -- subscription ended. A concurrent caller can only replace the same ID once.
  delete from public.billing_checkout_attempts where organization_id = p_org and id = p_replace;
  insert into public.billing_checkout_attempts
    (organization_id, plan, price_id, origin, customer_email, customer_name, initiated_by)
  values (p_org, p_plan, p_price, p_origin, p_email, p_name, p_user)
  on conflict (organization_id) do nothing;
  select * into strict attempt from public.billing_checkout_attempts where organization_id = p_org;
  return to_jsonb(attempt) || jsonb_build_object(
    'customer_id', sub.stripe_customer_id, 'ended_subscription_id', sub.stripe_subscription_id);
end;
$$;

-- A committed event receipt and its subscription mutation are inseparable.
create function public.apply_billing_event(
  p_event text, p_type text, p_org uuid, p_customer text, p_subscription text,
  p_plan text, p_status text, p_period_end timestamptz
) returns boolean language plpgsql set search_path = '' as $$
begin
  -- Other applications can share this Stripe account. Unlabelled events are
  -- ours only when their customer is already bound to a ReportFlow tenant.
  if p_org is null and not exists (
    select 1 from public.subscriptions where stripe_customer_id = p_customer
  ) then return false; end if;

  insert into public.stripe_webhook_events (id, type) values (p_event, p_type)
    on conflict (id) do nothing;
  if not found then return false; end if;

  update public.subscriptions set plan = p_plan, status = p_status,
    stripe_subscription_id = p_subscription, current_period_end = p_period_end
    where stripe_customer_id = p_customer and (p_org is null or organization_id = p_org);
  if not found then raise exception 'No matching billing customer'; end if;
  return true;
end;
$$;

revoke all on function public.reserve_billing_checkout(uuid,text,text,text,text,text,uuid,uuid),
  public.apply_billing_event(text,text,uuid,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_billing_checkout(uuid,text,text,text,text,text,uuid,uuid),
  public.apply_billing_event(text,text,uuid,text,text,text,text,timestamptz) to service_role;
