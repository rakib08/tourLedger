-- TourLedger Phase 3 enhancement: manager-recorded member contributions.
-- Apply AFTER 0003_financial_management.sql.
-- This records money already received by the manager; unlike a member submission,
-- it is posted directly to the official ledger after manager authorization.

create or replace function public.record_member_contribution(
  p_group_id uuid,
  p_member_id uuid,
  p_kind text,
  p_amount_minor bigint,
  p_payment_method text default 'cash',
  p_reference_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_transaction_id uuid;
begin
  if v_actor is null then
    raise exception 'Please sign in.';
  end if;

  -- Only the group's manager may directly post a contribution for another member.
  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the group manager can record a contribution on behalf of a member.';
  end if;

  if p_member_id is null or not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_member_id and is_active = true
  ) then
    raise exception 'Select an active member of this group.';
  end if;

  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 1000000000000 then
    raise exception 'Enter a valid contribution amount.';
  end if;

  if p_kind is null or p_kind not in ('standard', 'additional') then
    raise exception 'Select a valid contribution type.';
  end if;

  if p_payment_method is null or char_length(trim(p_payment_method)) not between 1 and 40 then
    raise exception 'Select a valid payment method.';
  end if;

  if p_reference_note is not null and char_length(p_reference_note) > 240 then
    raise exception 'Reference note must be 240 characters or fewer.';
  end if;

  insert into public.financial_transactions (
    group_id, type, contribution_kind, member_id, title, description,
    amount_minor, occurred_at, recorded_by, status
  ) values (
    p_group_id,
    'contribution'::public.transaction_type,
    p_kind::public.contribution_kind,
    p_member_id,
    case when p_kind = 'standard' then 'Standard contribution' else 'Additional contribution' end,
    concat(
      'Recorded by manager · ', trim(p_payment_method),
      case when nullif(trim(p_reference_note), '') is not null
        then ' — ' || trim(p_reference_note) else '' end
    ),
    p_amount_minor,
    now(),
    v_actor,
    'posted'::public.transaction_status
  ) returning id into v_transaction_id;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (
    p_group_id, v_actor, 'contribution.recorded_by_manager',
    'financial_transaction', v_transaction_id,
    jsonb_build_object(
      'member_id', p_member_id,
      'amount_minor', p_amount_minor,
      'kind', p_kind,
      'payment_method', trim(p_payment_method)
    )
  );

  return v_transaction_id;
end;
$$;

revoke all on function public.record_member_contribution(uuid, uuid, text, bigint, text, text) from public;
grant execute on function public.record_member_contribution(uuid, uuid, text, bigint, text, text) to authenticated;


-- Accurate group-wide totals independent of the transaction list pagination.
create or replace function public.get_group_finance_totals(p_group_id uuid)
returns table (
  total_contributions bigint,
  total_expenses bigint,
  total_refunds bigint,
  available_balance bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'You are not an active member of this group.';
  end if;

  return query
  select
    coalesce(sum(amount_minor) filter (where type = 'contribution'::public.transaction_type), 0)::bigint,
    coalesce(sum(amount_minor) filter (where type = 'expense'::public.transaction_type), 0)::bigint,
    coalesce(sum(amount_minor) filter (where type = 'refund'::public.transaction_type), 0)::bigint,
    (
      coalesce(sum(amount_minor) filter (where type in ('contribution'::public.transaction_type, 'refund'::public.transaction_type)), 0)
      - coalesce(sum(amount_minor) filter (where type = 'expense'::public.transaction_type), 0)
    )::bigint
  from public.financial_transactions
  where group_id = p_group_id and status = 'posted'::public.transaction_status;
end;
$$;

revoke all on function public.get_group_finance_totals(uuid) from public;
grant execute on function public.get_group_finance_totals(uuid) to authenticated;
