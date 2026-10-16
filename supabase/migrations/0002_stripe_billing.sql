-- Stripe lookup indexes + webhook idempotency.
-- Subscriptions remain select-only for authenticated users; writes go through
-- the service-role webhook / checkout functions.

create unique index if not exists subscriptions_stripe_customer_uidx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists subscriptions_stripe_subscription_uidx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_webhook_events force row level security;
