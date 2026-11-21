-- TourLedger Phase 2: secure group creation, member management and invitations.
-- Apply AFTER 0001_initial_schema.sql.

-- Tighten direct membership insertion: assistants may add ordinary members,
-- but only the manager may appoint an assistant manager.
drop policy if exists "members_add_manager" on public.group_members;
create policy "members_add_group_member" on public.group_members
for insert to authenticated
with check (
  added_by = (select auth.uid())
  and (
    (role = 'member'::public.group_role and public.can_manage_group(group_id))
    or (role = 'assistant_manager'::public.group_role and public.is_group_owner(group_id))
  )
);

-- The manager can deactivate members; role changes remain manager-only.
drop policy if exists "members_update_manager" on public.group_members;
create policy "members_update_group_owner" on public.group_members
for update to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

-- Create a member invitation atomically. The raw token is never stored.
create or replace function public.accept_group_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invitation public.group_invitations%rowtype;
  v_group_status public.group_status;
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must sign in before joining a group.';
  end if;
  if p_token_hash is null or length(p_token_hash) <> 64 then
    raise exception 'This invitation link is invalid or expired.';
  end if;

  select * into v_invitation
  from public.group_invitations
  where token_hash = p_token_hash
  for update;

  if not found
    or v_invitation.revoked_at is not null
    or v_invitation.expires_at <= now()
    or v_invitation.use_count >= v_invitation.max_uses then
    raise exception 'This invitation link is invalid, expired, revoked, or already used.';
  end if;

  select status into v_group_status
  from public.tour_groups where id = v_invitation.group_id;

  if v_group_status is null or v_group_status = 'archived'::public.group_status then
    raise exception 'This tour group is no longer accepting members.';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = v_invitation.group_id and user_id = v_user_id and is_active
  ) then
    raise exception 'You are already a member of this tour group.';
  end if;

  insert into public.group_members(group_id, user_id, role, is_active, added_by)
  values (v_invitation.group_id, v_user_id, 'member'::public.group_role, true, v_invitation.created_by)
  on conflict (group_id, user_id)
  do update set role = 'member'::public.group_role, is_active = true,
                added_by = excluded.added_by, joined_at = now();

  update public.group_invitations
  set use_count = use_count + 1
  where id = v_invitation.id;

  return v_invitation.group_id;
end;
$$;

-- Manager adds an existing registered user by email without exposing auth.users.
-- Assistant managers may add ordinary members but cannot appoint assistants.
create or replace function public.add_group_member_by_email(
  p_group_id uuid,
  p_email text,
  p_role public.group_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
  v_existing public.group_members%rowtype;
begin
  if v_actor is null then raise exception 'You must sign in.'; end if;
  if p_role is null or p_role not in ('member'::public.group_role, 'assistant_manager'::public.group_role) then
    raise exception 'That role cannot be assigned through this action.';
  end if;

  if p_role = 'assistant_manager'::public.group_role then
    if not public.is_group_owner(p_group_id) then
      raise exception 'Only the tour manager can appoint assistant managers.';
    end if;
  elsif not public.can_manage_group(p_group_id) then
    raise exception 'You do not have permission to add members.';
  end if;

  select id into v_target
  from auth.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if v_target is null then
    raise exception 'No registered TourLedger account was found for that email address.';
  end if;

  select * into v_existing
  from public.group_members
  where group_id = p_group_id and user_id = v_target;

  if found and v_existing.is_active then
    raise exception 'That user is already an active member of this group.';
  end if;

  insert into public.group_members(group_id, user_id, role, is_active, added_by)
  values (p_group_id, v_target, p_role, true, v_actor)
  on conflict (group_id, user_id)
  do update set role = excluded.role, is_active = true,
                added_by = excluded.added_by, joined_at = now();

  return v_target;
end;
$$;

-- Manager can deactivate an ordinary member or assistant; manager cannot remove self
-- or another manager through this routine.
create or replace function public.deactivate_group_member(
  p_group_id uuid,
  p_member_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target_role public.group_role;
begin
  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the tour manager can remove group members.';
  end if;
  if p_member_user_id = v_actor then
    raise exception 'The manager cannot remove their own account.';
  end if;

  select role into v_target_role
  from public.group_members
  where group_id = p_group_id and user_id = p_member_user_id and is_active
  for update;

  if v_target_role is null then raise exception 'Active group member not found.'; end if;
  if v_target_role = 'manager'::public.group_role then
    raise exception 'The group manager cannot be removed.';
  end if;

  update public.group_members set is_active = false
  where group_id = p_group_id and user_id = p_member_user_id;

end;
$$;


-- Audit every membership change, including changes made through direct table access.
create or replace function public.log_group_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_actor uuid;
  v_member_user_id uuid;
  v_role public.group_role;
  v_is_active boolean;
begin
  if tg_op = 'INSERT' then
    v_action := 'member.added';
    v_actor := coalesce((select auth.uid()), new.added_by);
    v_member_user_id := new.user_id;
    v_role := new.role;
    v_is_active := new.is_active;
  else
    v_action := case
      when old.is_active and not new.is_active then 'member.deactivated'
      when not old.is_active and new.is_active then 'member.reactivated'
      when old.role is distinct from new.role then 'member.role_changed'
      else 'member.updated'
    end;
    v_actor := (select auth.uid());
    v_member_user_id := new.user_id;
    v_role := new.role;
    v_is_active := new.is_active;
  end if;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (
    new.group_id,
    v_actor,
    v_action,
    'group_member',
    new.id,
    jsonb_build_object('member_id', v_member_user_id, 'role', v_role, 'is_active', v_is_active)
  );

  return new;
end;
$$;

drop trigger if exists group_member_audit on public.group_members;
create trigger group_member_audit
after insert or update on public.group_members
for each row execute procedure public.log_group_member_change();

-- Group audit trail for creation and changes.
create or replace function public.log_group_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (new.id, new.created_by, 'group.created', 'tour_group', new.id,
          jsonb_build_object('name', new.name, 'destination', new.destination));
  return new;
end;
$$;

drop trigger if exists tour_group_creation_audit on public.tour_groups;
create trigger tour_group_creation_audit
after insert on public.tour_groups
for each row execute procedure public.log_group_creation();

-- Do not allow direct client-side creation of arbitrary invitation token hashes;
-- invitations are created only by an authenticated server-side workflow with manager RLS.
-- The client may insert a hash through the existing manager policy. The raw token is
-- generated in the server action and only shown once to the manager.

revoke all on function public.accept_group_invitation(text) from public;
revoke all on function public.add_group_member_by_email(uuid, text, public.group_role) from public;
revoke all on function public.deactivate_group_member(uuid, uuid) from public;

grant execute on function public.accept_group_invitation(text) to authenticated;
grant execute on function public.add_group_member_by_email(uuid, text, public.group_role) to authenticated;
grant execute on function public.deactivate_group_member(uuid, uuid) to authenticated;
