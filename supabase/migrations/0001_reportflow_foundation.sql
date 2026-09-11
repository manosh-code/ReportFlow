-- ReportFlow multi-tenant foundation
-- Apply in Lovable Cloud → SQL editor (or supabase db push).
-- RLS is the security boundary. App queries never replace these policies.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  company_domain text,
  domain_auto_join boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_domain_format check (
    company_domain is null
    or company_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
  )
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users (id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'agency', 'enterprise')),
  status text not null default 'active' check (
    status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')
  ),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);
create index if not exists organization_members_org_idx
  on public.organization_members (organization_id);
create index if not exists invites_org_idx
  on public.invites (organization_id);
create index if not exists invites_email_idx
  on public.invites (lower(email));
create unique index if not exists invites_pending_unique
  on public.invites (organization_id, lower(email))
  where accepted_at is null;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, fixed search_path — avoids RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create or replace function public.user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

create or replace function public.has_org_role(_org_id uuid, _roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = _org_id
      and user_id = auth.uid()
      and role = any (_roles)
  );
$$;

create or replace function public.is_consumer_email_domain(_domain text)
returns boolean
language sql
immutable
as $$
  select lower(_domain) in (
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in',
    'outlook.com', 'hotmail.com', 'live.com', 'icloud.com',
    'me.com', 'proton.me', 'protonmail.com', 'aol.com',
    'mail.com', 'gmx.com', 'yandex.com'
  );
$$;

create or replace function public.slugify(_name text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  s := lower(regexp_replace(trim(_name), '[^a-zA-Z0-9]+', '-', 'g'));
  s := trim(both '-' from s);
  if s is null or s = '' then
    s := 'agency';
  end if;
  return left(s, 48);
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile + domain auto-join on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  domain text;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  domain := lower(split_part(new.email, '@', 2));

  if domain <> '' and not public.is_consumer_email_domain(domain) then
    insert into public.organization_members (organization_id, user_id, role)
    select o.id, new.id, 'member'
    from public.organizations o
    where o.domain_auto_join
      and o.company_domain = domain
    on conflict (organization_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs used by the app (atomic, RLS-safe)
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(_name text, _domain text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  base_slug text;
  final_slug text;
  domain_norm text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if length(trim(_name)) < 2 then
    raise exception 'Organization name is required';
  end if;

  domain_norm := nullif(lower(trim(_domain)), '');
  if domain_norm is not null and public.is_consumer_email_domain(domain_norm) then
    raise exception 'Use a company domain, not a personal email provider';
  end if;

  base_slug := public.slugify(_name);
  final_slug := base_slug;
  while exists (select 1 from public.organizations where slug = final_slug) loop
    final_slug := base_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end loop;

  insert into public.organizations (name, slug, company_domain, created_by)
  values (trim(_name), final_slug, domain_norm, auth.uid())
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, auth.uid(), 'owner');

  insert into public.subscriptions (organization_id, plan, status)
  values (org_id, 'free', 'active');

  return org_id;
end;
$$;

create or replace function public.create_invite(_org_id uuid, _email text, _role text default 'member')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_token uuid;
  email_norm text;
begin
  if not public.has_org_role(_org_id, array['owner', 'admin']) then
    raise exception 'Only owners and admins can invite teammates';
  end if;

  if _role not in ('admin', 'member') then
    raise exception 'Invalid invite role';
  end if;

  if public.has_org_role(_org_id, array['admin']) and not public.has_org_role(_org_id, array['owner']) then
    if _role = 'admin' then
      raise exception 'Admins can only invite members';
    end if;
  end if;

  email_norm := lower(trim(_email));
  if email_norm !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'Valid email is required';
  end if;

  delete from public.invites
  where organization_id = _org_id
    and lower(email) = email_norm
    and accepted_at is null;

  insert into public.invites (organization_id, email, role, invited_by)
  values (_org_id, email_norm, _role, auth.uid())
  returning token into invite_token;

  return invite_token;
end;
$$;

create or replace function public.get_invite_preview(_token uuid)
returns table (
  organization_name text,
  email text,
  role text,
  expired boolean,
  accepted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.name,
    i.email,
    i.role,
    i.expires_at < now(),
    i.accepted_at is not null
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = _token;
$$;

create or replace function public.accept_invite(_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into inv from public.invites where token = _token;
  if not found then
    raise exception 'Invite not found';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Invite already accepted';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  select email into user_email from public.profiles where id = auth.uid();
  if user_email is null then
    select email into user_email from auth.users where id = auth.uid();
  end if;

  if lower(user_email) <> lower(inv.email) then
    raise exception 'Sign in with % to accept this invite', inv.email;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (inv.organization_id, auth.uid(), inv.role)
  on conflict (organization_id, user_id) do update
    set role = excluded.role;

  update public.invites
  set accepted_at = now()
  where id = inv.id;

  return inv.organization_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invites enable row level security;
alter table public.subscriptions enable row level security;

alter table public.profiles force row level security;
alter table public.organizations force row level security;
alter table public.organization_members force row level security;
alter table public.invites force row level security;
alter table public.subscriptions force row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_select_org_peers on public.profiles;
create policy profiles_select_org_peers
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members me
      join public.organization_members them
        on them.organization_id = me.organization_id
      where me.user_id = auth.uid()
        and them.user_id = profiles.id
    )
  );

drop policy if exists orgs_select_member on public.organizations;
create policy orgs_select_member
  on public.organizations for select
  to authenticated
  using (id in (select public.user_org_ids()));

drop policy if exists orgs_update_admin on public.organizations;
create policy orgs_update_admin
  on public.organizations for update
  to authenticated
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));

drop policy if exists members_select_same_org on public.organization_members;
create policy members_select_same_org
  on public.organization_members for select
  to authenticated
  using (organization_id in (select public.user_org_ids()));

drop policy if exists members_delete_admin on public.organization_members;
create policy members_delete_admin
  on public.organization_members for delete
  to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin'])
    and role <> 'owner'
  );

drop policy if exists invites_select_admin on public.invites;
create policy invites_select_admin
  on public.invites for select
  to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));

drop policy if exists invites_delete_admin on public.invites;
create policy invites_delete_admin
  on public.invites for delete
  to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin'])
    and accepted_at is null
  );

drop policy if exists subs_select_member on public.subscriptions;
create policy subs_select_member
  on public.subscriptions for select
  to authenticated
  using (organization_id in (select public.user_org_ids()));

grant usage on schema public to anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select, update on table public.organizations to authenticated;
grant select, delete on table public.organization_members to authenticated;
grant select, delete on table public.invites to authenticated;
grant select on table public.subscriptions to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.create_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.get_invite_preview(uuid) to anon, authenticated;
grant execute on function public.user_org_ids() to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
