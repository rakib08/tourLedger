-- Temporary Super Admin approval workflow.
-- Apply after migrations 0001-0006. Add the intended Super Admin user below
-- using their Supabase Auth UUID (Authentication > Users).
alter table public.tour_groups
  add column if not exists approval_status text not null default 'approved'
  check (approval_status in ('pending', 'approved', 'rejected'));

-- Existing groups remain approved. New requests are explicitly inserted as pending.
create table if not exists public.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.super_admins enable row level security;
revoke all on public.super_admins from anon, authenticated;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.super_admins sa
    where sa.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Pending requests are visible only to their requester and Super Admin.
drop policy if exists "groups_read_members" on public.tour_groups;
create policy "groups_read_members" on public.tour_groups
for select to authenticated
using (
  public.is_group_member(id)
  or created_by = (select auth.uid())
  or public.is_super_admin()
);

drop policy if exists "groups_create_self" on public.tour_groups;
create policy "groups_create_pending" on public.tour_groups
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and approval_status = 'pending'
);

-- A creator must not be able to change approval status through ordinary updates.
drop policy if exists "groups_update_manager" on public.tour_groups;
create policy "groups_update_manager" on public.tour_groups
for update to authenticated
using (public.is_group_owner(id))
with check (public.is_group_owner(id));

create or replace function public.prevent_group_approval_tampering()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.approval_status is distinct from old.approval_status
     and not public.is_super_admin() then
    raise exception 'Only a Super Admin can change group approval status.';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_group_approval_status on public.tour_groups;
create trigger protect_group_approval_status
before update on public.tour_groups
for each row execute procedure public.prevent_group_approval_tampering();

-- Group creators are made manager only after approval.
create or replace function public.add_group_creator_as_manager()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.approval_status = 'approved' then
    insert into public.group_members (group_id, user_id, role, added_by)
    values (new.id, new.created_by, 'manager'::public.group_role, new.created_by)
    on conflict (group_id, user_id) do update set is_active = true, role = 'manager';
  end if;
  return new;
end;
$$;

create or replace function public.super_admin_approve_group(p_group_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_group public.tour_groups%rowtype;
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required.'; end if;
  select * into v_group from public.tour_groups where id = p_group_id for update;
  if not found then raise exception 'Group request not found.'; end if;
  if v_group.approval_status <> 'pending' then raise exception 'This request has already been reviewed.'; end if;

  update public.tour_groups set approval_status = 'approved' where id = p_group_id;
  insert into public.group_members(group_id, user_id, role, added_by)
  values (p_group_id, v_group.created_by, 'manager'::public.group_role, v_group.created_by)
  on conflict (group_id, user_id) do update set role = 'manager', is_active = true;

  insert into public.expense_categories(group_id, name)
  values
    (p_group_id, 'Transportation'), (p_group_id, 'Accommodation'),
    (p_group_id, 'Food'), (p_group_id, 'Tickets'),
    (p_group_id, 'Shopping'), (p_group_id, 'Other')
  on conflict (group_id, name) do nothing;
end;
$$;

create or replace function public.super_admin_reject_group(p_group_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required.'; end if;
  update public.tour_groups
  set approval_status = 'rejected'
  where id = p_group_id and approval_status = 'pending';
  if not found then raise exception 'Pending group request not found.'; end if;
end;
$$;

create or replace function public.super_admin_delete_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_super_admin() then raise exception 'Super Admin access required.'; end if;
  delete from public.tour_groups where id = p_group_id;
  if not found then raise exception 'Group not found.'; end if;
end;
$$;

revoke all on function public.super_admin_approve_group(uuid) from public;
revoke all on function public.super_admin_reject_group(uuid) from public;
revoke all on function public.super_admin_delete_group(uuid) from public;
grant execute on function public.super_admin_approve_group(uuid) to authenticated;
grant execute on function public.super_admin_reject_group(uuid) to authenticated;
grant execute on function public.super_admin_delete_group(uuid) to authenticated;

-- Existing data was already approved before this workflow was introduced.
