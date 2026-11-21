-- TourLedger initial schema. Apply in Supabase SQL Editor or with Supabase CLI.
-- Amounts are integer minor units (BDT poisha: 100 = ৳1).

create extension if not exists pgcrypto;

do $$ begin
  create type public.group_role as enum ('manager', 'assistant_manager', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.group_status as enum ('planning', 'active', 'completed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('contribution', 'expense', 'refund');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contribution_kind as enum ('standard', 'additional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_status as enum ('posted', 'voided');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tour_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text,
  destination text,
  start_date date,
  end_date date,
  currency_code char(3) not null default 'BDT',
  status public.group_status not null default 'planning',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.group_role not null default 'member',
  is_active boolean not null default true,
  added_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);
create unique index if not exists one_active_manager_per_group on public.group_members(group_id) where role = 'manager' and is_active;
create index if not exists group_members_user_idx on public.group_members(user_id, is_active);
create index if not exists group_members_group_idx on public.group_members(group_id, is_active);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups(id) on delete cascade,
  token_hash text not null unique,
  invited_role public.group_role not null default 'member' check (invited_role = 'member'),
  created_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  use_count integer not null default 0 check (use_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists group_invitations_group_idx on public.group_invitations(group_id);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (group_id, name),
  unique (id, group_id)
);

-- One ledger table records every cash movement. Do not hard-delete posted rows.
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups(id) on delete cascade,
  type public.transaction_type not null,
  contribution_kind public.contribution_kind,
  member_id uuid references auth.users(id) on delete restrict,
  category_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 140),
  description text,
  amount_minor bigint not null check (amount_minor > 0),
  occurred_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  receipt_path text,
  status public.transaction_status not null default 'posted',
  reversal_of uuid references public.financial_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_type_fields check (
    (type = 'contribution' and member_id is not null and contribution_kind is not null and category_id is null)
    or (type = 'expense' and member_id is null and contribution_kind is null)
    or (type = 'refund' and member_id is not null and contribution_kind is null and category_id is null)
  ),
  constraint transaction_not_self_reversal check (reversal_of is null or reversal_of <> id),
  constraint category_group_fk foreign key (category_id, group_id)
    references public.expense_categories(id, group_id) on delete restrict
);
create index if not exists financial_transactions_group_date_idx
  on public.financial_transactions(group_id, occurred_at desc);
create index if not exists financial_transactions_member_idx
  on public.financial_transactions(group_id, member_id) where member_id is not null;

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tour_groups(id) on delete cascade,
  total_refund_minor bigint not null check (total_refund_minor >= 0),
  finalized_by uuid not null references auth.users(id) on delete restrict,
  finalized_at timestamptz not null default now(),
  note text
);

create table if not exists public.settlement_allocations (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  unique (settlement_id, member_id)
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.tour_groups(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_group_date_idx on public.activity_logs(group_id, created_at desc);

-- Keep profile rows synchronized with Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Security-definer helpers avoid recursive RLS checks on group_members.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = (select auth.uid()) and gm.is_active
  );
$$;

create or replace function public.can_manage_group(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = (select auth.uid())
      and gm.is_active and gm.role in ('manager'::public.group_role, 'assistant_manager'::public.group_role)
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = (select auth.uid())
      and gm.is_active and gm.role = 'manager'::public.group_role
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.can_manage_group(uuid) from public;
revoke all on function public.is_group_owner(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.can_manage_group(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;

-- A group creator automatically becomes its first manager.
create or replace function public.add_group_creator_as_manager()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, role, added_by)
  values (new.id, new.created_by, 'manager'::public.group_role, new.created_by);
  return new;
end;
$$;
drop trigger if exists on_group_created_add_manager on public.tour_groups;
create trigger on_group_created_add_manager after insert on public.tour_groups
for each row execute procedure public.add_group_creator_as_manager();

-- Append-only activity records for financial ledger changes.
create or replace function public.log_financial_transaction_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_group_id uuid;
  v_id uuid;
  v_action text;
  v_details jsonb;
begin
  if tg_op = 'DELETE' then
    v_group_id := old.group_id; v_id := old.id; v_action := 'transaction.deleted';
    v_details := jsonb_build_object('old', to_jsonb(old));
  elsif tg_op = 'INSERT' then
    v_group_id := new.group_id; v_id := new.id; v_action := 'transaction.created';
    v_details := jsonb_build_object('new', to_jsonb(new));
  else
    v_group_id := new.group_id; v_id := new.id; v_action := 'transaction.updated';
    v_details := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;
  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (v_group_id, (select auth.uid()), v_action, 'financial_transaction', v_id, v_details);
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
drop trigger if exists financial_transaction_audit on public.financial_transactions;
create trigger financial_transaction_audit after insert or update or delete on public.financial_transactions
for each row execute procedure public.log_financial_transaction_change();

-- RLS is enabled on every tenant-scoped table.
alter table public.profiles enable row level security;
alter table public.tour_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
alter table public.expense_categories enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.settlements enable row level security;
alter table public.settlement_allocations enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles: signed-in users can see names/avatars of people sharing a group with them.
create policy "profiles_read_self_or_group_peers" on public.profiles for select to authenticated
using (
  id = (select auth.uid()) or exists (
    select 1 from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid()) and mine.is_active
      and theirs.user_id = profiles.id and theirs.is_active
  )
);
create policy "profiles_update_self" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Group rows are visible to active members. A signed-in user may create a group for themselves.
create policy "groups_read_members" on public.tour_groups for select to authenticated
using (public.is_group_member(id));
create policy "groups_create_self" on public.tour_groups for insert to authenticated
with check (created_by = (select auth.uid()));
create policy "groups_update_manager" on public.tour_groups for update to authenticated
using (public.is_group_owner(id)) with check (public.is_group_owner(id));

create policy "members_read_group" on public.group_members for select to authenticated
using (public.is_group_member(group_id));
create policy "members_add_manager" on public.group_members for insert to authenticated
with check (public.can_manage_group(group_id) and added_by = (select auth.uid()) and role <> 'manager');
create policy "members_update_manager" on public.group_members for update to authenticated
using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));

create policy "invites_read_managers" on public.group_invitations for select to authenticated
using (public.can_manage_group(group_id));
create policy "invites_create_managers" on public.group_invitations for insert to authenticated
with check (public.can_manage_group(group_id) and created_by = (select auth.uid()));
create policy "invites_revoke_managers" on public.group_invitations for update to authenticated
using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));

create policy "categories_read_group" on public.expense_categories for select to authenticated
using (public.is_group_member(group_id));
create policy "categories_manage_group" on public.expense_categories for all to authenticated
using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));

-- All members see every posted/voided row for full transparency; only managers can write.
create policy "transactions_read_group" on public.financial_transactions for select to authenticated
using (public.is_group_member(group_id));
create policy "transactions_create_managers" on public.financial_transactions for insert to authenticated
with check (public.can_manage_group(group_id) and recorded_by = (select auth.uid()));
create policy "transactions_update_managers" on public.financial_transactions for update to authenticated
using (public.can_manage_group(group_id)) with check (public.can_manage_group(group_id));
-- Physical delete is intentionally not granted by policy; use status='voided' and preserve audit history.

create policy "settlements_read_group" on public.settlements for select to authenticated
using (public.is_group_member(group_id));
create policy "settlements_create_owner" on public.settlements for insert to authenticated
with check (public.is_group_owner(group_id) and finalized_by = (select auth.uid()));
create policy "allocations_read_group" on public.settlement_allocations for select to authenticated
using (exists (
  select 1 from public.settlements s
  where s.id = settlement_allocations.settlement_id and public.is_group_member(s.group_id)
));
create policy "allocations_create_owner" on public.settlement_allocations for insert to authenticated
with check (exists (
  select 1 from public.settlements s
  where s.id = settlement_allocations.settlement_id and public.is_group_owner(s.group_id)
));

create policy "activity_read_group" on public.activity_logs for select to authenticated
using (public.is_group_member(group_id));
-- Activity logs are written by trusted triggers/functions, never directly by client users.

-- Default category seeds are created by the group-creation server workflow after group insert.
