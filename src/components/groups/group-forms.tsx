'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  acceptInviteAction,
  addGroupMemberAction,
  createGroupAction,
  createInviteAction,
  type GroupActionState,
} from '@/app/groups/actions';

const initial: GroupActionState = {};

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="min-h-12 w-full rounded-xl bg-[#10243a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#193956] disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Please wait…' : children}</button>;
}

function Feedback({ state }: { state: GroupActionState }) {
  return <>
    {state.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{state.error}</p>}
    {state.success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{state.success}</p>}
    {state.inviteUrl && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="break-all text-xs text-slate-600">{state.inviteUrl}</p><button type="button" onClick={() => navigator.clipboard.writeText(state.inviteUrl!)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[#10243a] underline">Copy invitation link</button></div>}
  </>;
}

export function CreateGroupForm() {
  const [state, action] = useActionState(createGroupAction, initial);
  return <form action={action} className="space-y-5">
    <div><label className="mb-2 block text-sm font-medium text-slate-700">Group Name *</label><input name="name" required minLength={2} maxLength={100} placeholder="e.g. Saint Martin Tour 2027" className="w-full min-h-12 rounded-xl border border-slate-200 px-3.5 py-3 text-base outline-none focus:border-[#10243a] focus:ring-2 focus:ring-[#10243a]/10"/></div>
    <div><label className="mb-2 block text-sm font-medium text-slate-700">Destination</label><input name="destination" maxLength={120} placeholder="e.g. Saint Martin's Island" className="w-full min-h-12 rounded-xl border border-slate-200 px-3.5 py-3 text-base outline-none focus:border-[#10243a]"/></div>
    <div><label className="mb-2 block text-sm font-medium text-slate-700">Description</label><textarea name="description" rows={3} maxLength={1000} placeholder="A short description of your trip" className="w-full min-h-12 rounded-xl border border-slate-200 px-3.5 py-3 text-base outline-none focus:border-[#10243a]"/></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="mb-2 block text-sm font-medium text-slate-700">Start Date</label><input type="date" name="startDate" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></div>
      <div><label className="mb-2 block text-sm font-medium text-slate-700">End Date</label><input type="date" name="endDate" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></div>
    </div>
    <div><label className="mb-2 block text-sm font-medium text-slate-700">Currency</label><select name="currencyCode" defaultValue="BDT" className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base"><option value="BDT">BDT — Bangladeshi Taka</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="INR">INR — Indian Rupee</option><option value="KRW">KRW — South Korean Won</option></select></div>
    <Feedback state={state}/>
    <Submit>Submit For Approval</Submit>
  </form>;
}

export function CreateInviteForm({ groupId }: { groupId: string }) {
  const action = createInviteAction.bind(null, groupId);
  const [state, formAction] = useActionState(action, initial);
  return <form action={formAction} className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-slate-600">Expires after<select name="expiresInDays" defaultValue="7" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="1">1 Day</option><option value="3">3 Days</option><option value="7">7 Days</option><option value="14">14 Days</option><option value="30">30 Days</option></select></label>
      <label className="text-sm text-slate-600">Maximum uses<select name="maxUses" defaultValue="1" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="1">1 Member</option><option value="5">5 Members</option><option value="10">10 Members</option><option value="25">25 Members</option><option value="50">50 Members</option><option value="100">100 Members</option></select></label>
    </div>
    <Feedback state={state}/>
    <Submit>Create invitation link</Submit>
  </form>;
}

export function AddMemberForm({ groupId, canPromote }: { groupId: string; canPromote: boolean }) {
  const action = addGroupMemberAction.bind(null, groupId);
  const [state, formAction] = useActionState(action, initial);
  return <form action={formAction} className="space-y-3">
    <label className="block text-sm text-slate-600">Registered user's email<input name="email" type="email" required placeholder="member@example.com" className="mt-1.5 w-full min-h-12 rounded-xl border border-slate-200 px-3.5 py-3 text-base outline-none focus:border-[#10243a]"/></label>
    <label className="block text-sm text-slate-600">Group role<select name="role" defaultValue="member" className="mt-1.5 w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base"><option value="member">Member</option>{canPromote && <option value="assistant_manager">Assistant Manager</option>}</select></label>
    <Feedback state={state}/>
    <Submit>Add registered user</Submit>
  </form>;
}

export function AcceptInviteForm({ token }: { token: string }) {
  const action = acceptInviteAction.bind(null, token);
  const [state, formAction] = useActionState(action, initial);
  return <form action={formAction} className="space-y-3"><Feedback state={state}/><Submit>Join this tour group</Submit></form>;
}
