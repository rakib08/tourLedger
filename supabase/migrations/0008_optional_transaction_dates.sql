-- Optional effective dates for contribution submissions and manager-recorded contributions.
-- Apply after 0004_manager_recorded_contributions.sql.
-- A blank date uses the actual submission/recording timestamp.

alter table public.contribution_submissions
  add column if not exists occurred_at timestamptz not null default now();

-- Replace the old signature so callers cannot bypass the new optional date argument.
drop function if exists public.submit_contribution(uuid, text, bigint, text, text, text);

create function public.submit_contribution(
  p_group_id uuid,
  p_kind text,
  p_amount_minor bigint,
  p_payment_method text default 'cash',
  p_reference_note text default null,
  p_proof_path text default null,
  p_occurred_at timestamptz default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user is null then raise exception 'Please sign in to submit a payment.'; end if;
  if not public.is_group_member(p_group_id) then raise exception 'You are not an active member of this group.'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 1000000000000 then
    raise exception 'Enter a valid contribution amount.';
  end if;
  if p_kind is null or p_kind not in ('standard', 'additional') then raise exception 'Invalid contribution type.'; end if;
  if p_payment_method is null or char_length(trim(p_payment_method)) not between 1 and 40 then
    raise exception 'Select a valid payment method.';
  end if;
  if p_proof_path is not null and (length(p_proof_path) > 500 or position('..' in p_proof_path) > 0) then
    raise exception 'Invalid payment proof reference.';
  end if;

  insert into public.contribution_submissions(
    group_id, member_id, contribution_kind, amount_minor, payment_method,
    reference_note, proof_path, occurred_at
  ) values (
    p_group_id, v_user, p_kind::public.contribution_kind, p_amount_minor,
    trim(p_payment_method), nullif(trim(p_reference_note), ''), p_proof_path,
    coalesce(p_occurred_at, now())
  ) returning id into v_id;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (p_group_id, v_user, 'contribution.submitted', 'contribution_submission', v_id,
    jsonb_build_object('amount_minor', p_amount_minor, 'kind', p_kind,
      'occurred_at', coalesce(p_occurred_at, now())));
  return v_id;
end;
$$;

revoke all on function public.submit_contribution(uuid, text, bigint, text, text, text, timestamptz) from public;
grant execute on function public.submit_contribution(uuid, text, bigint, text, text, text, timestamptz) to authenticated;

-- Approval posts the payment using the date the member selected, not the review date.
create or replace function public.review_contribution_submission(
  p_submission_id uuid,
  p_decision text,
  p_review_note text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_submission public.contribution_submissions%rowtype;
  v_transaction_id uuid;
begin
  if v_actor is null then raise exception 'Please sign in.'; end if;
  if p_decision is null or p_decision not in ('approve', 'reject') then raise exception 'Invalid review decision.'; end if;

  select * into v_submission from public.contribution_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'Payment submission not found.'; end if;
  if not public.can_manage_group(v_submission.group_id) then raise exception 'You do not have permission to review payments.'; end if;
  if v_submission.status <> 'pending' then raise exception 'This payment has already been reviewed.'; end if;

  if p_decision = 'approve' then
    insert into public.financial_transactions(
      group_id, type, contribution_kind, member_id, title, description,
      amount_minor, occurred_at, recorded_by, status
    ) values (
      v_submission.group_id, 'contribution'::public.transaction_type,
      v_submission.contribution_kind, v_submission.member_id,
      case when v_submission.contribution_kind = 'standard' then 'Standard contribution' else 'Additional contribution' end,
      concat('Verified ', v_submission.payment_method,
        case when v_submission.reference_note is not null then ' — ' || v_submission.reference_note else '' end),
      v_submission.amount_minor, v_submission.occurred_at, v_actor,
      'posted'::public.transaction_status
    ) returning id into v_transaction_id;

    update public.contribution_submissions set status = 'approved', reviewed_by = v_actor,
      reviewed_at = now(), review_note = nullif(trim(p_review_note), ''), transaction_id = v_transaction_id
    where id = p_submission_id;
  else
    update public.contribution_submissions set status = 'rejected', reviewed_by = v_actor,
      reviewed_at = now(), review_note = nullif(trim(p_review_note), '')
    where id = p_submission_id;
  end if;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (v_submission.group_id, v_actor, 'contribution.' || p_decision,
    'contribution_submission', p_submission_id,
    jsonb_build_object('amount_minor', v_submission.amount_minor, 'member_id', v_submission.member_id,
      'transaction_id', v_transaction_id, 'review_note', nullif(trim(p_review_note), ''),
      'occurred_at', v_submission.occurred_at));
  return v_transaction_id;
end;
$$;

-- Manager-recorded contributions also accept an optional effective date.
drop function if exists public.record_member_contribution(uuid, uuid, text, bigint, text, text);

create function public.record_member_contribution(
  p_group_id uuid,
  p_member_id uuid,
  p_kind text,
  p_amount_minor bigint,
  p_payment_method text default 'cash',
  p_reference_note text default null,
  p_occurred_at timestamptz default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_transaction_id uuid;
begin
  if v_actor is null then raise exception 'Please sign in.'; end if;
  if not public.is_group_owner(p_group_id) then
    raise exception 'Only the group manager can record a contribution on behalf of a member.';
  end if;
  if p_member_id is null or not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_member_id and is_active = true
  ) then raise exception 'Select an active member of this group.'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 1000000000000 then
    raise exception 'Enter a valid contribution amount.';
  end if;
  if p_kind is null or p_kind not in ('standard', 'additional') then raise exception 'Invalid contribution type.'; end if;
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
    p_group_id, 'contribution'::public.transaction_type, p_kind::public.contribution_kind,
    p_member_id,
    case when p_kind = 'standard' then 'Standard contribution' else 'Additional contribution' end,
    concat('Recorded by manager · ', trim(p_payment_method),
      case when nullif(trim(p_reference_note), '') is not null then ' — ' || trim(p_reference_note) else '' end),
    p_amount_minor, coalesce(p_occurred_at, now()), v_actor,
    'posted'::public.transaction_status
  ) returning id into v_transaction_id;

  insert into public.activity_logs(group_id, actor_id, action, entity_type, entity_id, details)
  values (p_group_id, v_actor, 'contribution.recorded_by_manager',
    'financial_transaction', v_transaction_id,
    jsonb_build_object('member_id', p_member_id, 'amount_minor', p_amount_minor,
      'kind', p_kind, 'payment_method', trim(p_payment_method),
      'occurred_at', coalesce(p_occurred_at, now())));
  return v_transaction_id;
end;
$$;

revoke all on function public.record_member_contribution(uuid, uuid, text, bigint, text, text, timestamptz) from public;
grant execute on function public.record_member_contribution(uuid, uuid, text, bigint, text, text, timestamptz) to authenticated;
