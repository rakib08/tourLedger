'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type GroupActionState = { error?: string; success?: string; inviteUrl?: string };

const groupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  destination: z.string().trim().max(120).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  currencyCode: z.string().trim().length(3).transform(v => v.toUpperCase()),
});

export async function createGroupAction(_previous: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const parsed = groupSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    destination: formData.get('destination') || undefined,
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
    currencyCode: formData.get('currencyCode') || 'BDT',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the group information.' };
  if (parsed.data.startDate && parsed.data.endDate && parsed.data.endDate < parsed.data.startDate) {
    return { error: 'The end date cannot be earlier than the start date.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('tour_groups').insert({
    name: parsed.data.name,
    description: parsed.data.description || null,
    destination: parsed.data.destination || null,
    start_date: parsed.data.startDate || null,
    end_date: parsed.data.endDate || null,
    currency_code: parsed.data.currencyCode,
    created_by: user.id,
    approval_status: 'pending',
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: 'Your group request has been submitted. The group will be created after Super Admin approval.' };
}

export async function createInviteAction(groupId: string, _previous: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const days = Number(formData.get('expiresInDays') || 7);
  const maxUses = Number(formData.get('maxUses') || 1);
  if (!Number.isInteger(days) || days < 1 || days > 30) return { error: 'Invitation expiry must be between 1 and 30 days.' };
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) return { error: 'Maximum uses must be between 1 and 100.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('group_invitations').insert({
    group_id: groupId,
    token_hash: tokenHash,
    invited_role: 'member',
    created_by: user.id,
    expires_at: expiresAt,
    max_uses: maxUses,
  });
  if (error) return { error: error.message };

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const inviteUrl = `${origin.replace(/\/$/, '')}/join/${token}`;
  revalidatePath(`/groups/${groupId}`);
  return { success: 'Invitation link created. Copy and share it; the raw token is shown only once.', inviteUrl };
}

export async function addGroupMemberAction(groupId: string, _previous: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? 'member');
  if (!z.string().email().safeParse(email).success) return { error: 'Enter a valid email address.' };
  if (role !== 'member' && role !== 'assistant_manager') return { error: 'Select a valid group role.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.rpc('add_group_member_by_email', {
    p_group_id: groupId,
    p_email: email,
    p_role: role,
  });
  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath('/dashboard');
  return { success: `${email} was added to the tour group.` };
}

export async function deactivateMemberAction(groupId: string, memberUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.rpc('deactivate_group_member', {
    p_group_id: groupId,
    p_member_user_id: memberUserId,
  });
  if (error) redirect(`/groups/${groupId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/groups/${groupId}`);
}

export async function acceptInviteAction(token: string, _previous: GroupActionState, _formData: FormData): Promise<GroupActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);

  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const { data: groupId, error } = await supabase.rpc('accept_group_invitation', {
    p_token_hash: tokenHash,
  });
  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  redirect(`/groups/${groupId}`);
}
