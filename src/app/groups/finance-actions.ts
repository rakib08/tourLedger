'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseMoneyInput } from '@/lib/money';

export type FinanceActionState = { error?: string; success?: string };

async function parseGroupAmount(supabase: Awaited<ReturnType<typeof createClient>>, groupId: string, value: FormDataEntryValue | null) {
  const { data, error } = await supabase.from('tour_groups').select('currency_code').eq('id', groupId).maybeSingle();
  if (error || !data) return null;
  const amount = parseMoneyInput(String(value ?? ''), String(data.currency_code).trim());
  return amount && amount > 0 ? amount : null;
}


function parseOptionalOccurrenceDate(value: FormDataEntryValue | null): string | null | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const [year, month, day] = raw.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return undefined;
  // Noon UTC keeps the selected calendar date stable in common user time zones.
  return `${raw}T12:00:00.000Z`;
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

function refreshFinance(groupId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/finances`);
  revalidatePath(`/groups/${groupId}/finances/contributions`);
  revalidatePath(`/groups/${groupId}/finances/expenses`);
  revalidatePath(`/groups/${groupId}/finances/payments`);
  revalidatePath(`/groups/${groupId}/finances/transactions`);
  revalidatePath('/dashboard');
}

export async function submitContributionAction(groupId: string, _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const { supabase } = await requireUser();
  const amount = await parseGroupAmount(supabase, groupId, formData.get('amount'));
  const kind = String(formData.get('kind') ?? 'standard');
  const method = String(formData.get('paymentMethod') ?? 'cash');
  const reference = String(formData.get('referenceNote') ?? '').trim();
  if (!amount) return { error: 'Enter an amount greater than zero (up to two decimal places).' };
  if (!['standard', 'additional'].includes(kind)) return { error: 'Select a valid contribution type.' };
  if (!['cash', 'bank_transfer', 'mobile_banking', 'other'].includes(method)) return { error: 'Select a valid payment method.' };
  if (reference.length > 240) return { error: 'Reference must be 240 characters or fewer.' };
  const occurredAt = parseOptionalOccurrenceDate(formData.get('occurredAt'));
  if (occurredAt === undefined) return { error: 'Select a valid payment date.' };
  const { error } = await supabase.rpc('submit_contribution', {
    p_group_id: groupId, p_kind: kind, p_amount_minor: amount,
    p_payment_method: method, p_reference_note: reference || null, p_proof_path: null,
    p_occurred_at: occurredAt,
  });
  if (error) return { error: error.message };
  refreshFinance(groupId);
  return { success: 'Payment submitted. It will appear in the official balance after manager verification.' };
}

export async function reviewContributionAction(groupId: string, submissionId: string, decision: 'approve' | 'reject', _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const note = String(formData.get('reviewNote') ?? '').trim();
  if (note.length > 300) return { error: 'Review note must be 300 characters or fewer.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('review_contribution_submission', {
    p_submission_id: submissionId, p_decision: decision, p_review_note: note || null,
  });
  if (error) return { error: error.message };
  refreshFinance(groupId);
  return { success: decision === 'approve' ? 'Payment verified and added to the official ledger.' : 'Payment submission rejected.' };
}

export async function recordMemberContributionAction(groupId: string, _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const { supabase } = await requireUser();
  const amount = await parseGroupAmount(supabase, groupId, formData.get('amount'));
  const memberId = String(formData.get('memberId') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'standard');
  const method = String(formData.get('paymentMethod') ?? 'cash');
  const reference = String(formData.get('referenceNote') ?? '').trim();
  if (!memberId) return { error: 'Select the member who gave the money.' };
  if (!amount) return { error: 'Enter an amount greater than zero.' };
  if (!['standard', 'additional'].includes(kind)) return { error: 'Select a valid contribution type.' };
  if (!['cash', 'bank_transfer', 'mobile_banking', 'other'].includes(method)) return { error: 'Select a valid payment method.' };
  if (reference.length > 240) return { error: 'Reference must be 240 characters or fewer.' };
  const occurredAt = parseOptionalOccurrenceDate(formData.get('occurredAt'));
  if (occurredAt === undefined) return { error: 'Select a valid payment date.' };

  const { error } = await supabase.rpc('record_member_contribution', {
    p_group_id: groupId,
    p_member_id: memberId,
    p_kind: kind,
    p_amount_minor: amount,
    p_payment_method: method,
    p_reference_note: reference || null,
    p_occurred_at: occurredAt,
  });
  if (error) return { error: error.message };
  refreshFinance(groupId);
  revalidatePath(`/groups/${groupId}/finances/contributions`);
  return { success: 'Contribution recorded for the selected member and added to the official balance.' };
}

export async function recordExpenseAction(groupId: string, _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const title = String(formData.get('title') ?? '').trim();
  const { supabase } = await requireUser();
  const amount = await parseGroupAmount(supabase, groupId, formData.get('amount'));
  const categoryId = String(formData.get('categoryId') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (title.length < 1 || title.length > 140) return { error: 'Enter an expense title (maximum 140 characters).' };
  if (!amount) return { error: 'Enter an amount greater than zero (up to two decimal places).' };
  if (description.length > 1000) return { error: 'Description must be 1,000 characters or fewer.' };
  const occurredAt = parseOptionalOccurrenceDate(formData.get('occurredAt'));
  if (occurredAt === undefined) return { error: 'Select a valid expense date.' };
  const { error } = await supabase.rpc('record_group_expense', {
    p_group_id: groupId, p_title: title, p_amount_minor: amount,
    p_category_id: categoryId || null, p_description: description || null,
    p_occurred_at: occurredAt || new Date().toISOString(), p_receipt_path: null,
  });
  if (error) return { error: error.message };
  refreshFinance(groupId);
  return { success: 'Expense recorded in the group ledger.' };
}

export async function updateStandardContributionAction(groupId: string, _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const { supabase } = await requireUser();
  const { data: group } = await supabase.from('tour_groups').select('currency_code').eq('id', groupId).maybeSingle();
  if (!group) return { error: 'Tour group not found.' };
  const amount = parseMoneyInput(String(formData.get('amount') ?? ''), String(group.currency_code).trim());
  if (amount === null) return { error: 'Enter a valid standard contribution amount.' };
  const { error } = await supabase.rpc('set_group_standard_contribution', { p_group_id: groupId, p_amount_minor: amount });
  if (error) return { error: error.message };
  refreshFinance(groupId);
  return { success: 'Standard contribution amount updated.' };
}

export async function voidTransactionAction(groupId: string, transactionId: string, _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const reason = z.string().trim().min(3).max(300).safeParse(formData.get('reason'));
  if (!reason.success) return { error: 'Enter a reason between 3 and 300 characters.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('void_financial_transaction', { p_transaction_id: transactionId, p_reason: reason.data });
  if (error) return { error: error.message };
  refreshFinance(groupId);
  return { success: 'Transaction marked as voided. Its audit history is preserved.' };
}


export async function finalizeSettlementAction(groupId: string, _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const memberIds = formData.getAll('memberIds').map(value => String(value).trim()).filter(Boolean);
  const note = String(formData.get('note') ?? '').trim();
  if (memberIds.length === 0) return { error: 'Select at least one active member.' };
  if (new Set(memberIds).size !== memberIds.length) return { error: 'A member can only be selected once.' };
  if (note.length > 500) return { error: 'Settlement note must be 500 characters or fewer.' };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('finalize_group_settlement', {
    p_group_id: groupId,
    p_member_ids: memberIds,
    p_note: note || null,
  });
  if (error) return { error: error.message };
  refreshFinance(groupId);
  revalidatePath(`/groups/${groupId}/finances/reports`);
  revalidatePath(`/groups/${groupId}/finances/settlement`);
  return { success: 'Settlement finalized. The allocation snapshot is now locked and the group is closed.' };
}
