'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { finalizeSettlementAction, type FinanceActionState } from '@/app/groups/finance-actions';
import { formatMoney } from '@/lib/money';

const initial: FinanceActionState = {};
const field = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#10243a] focus:ring-2 focus:ring-[#10243a]/10';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="min-h-12 w-full rounded-xl bg-[#10243a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Finalizing settlement…' : 'Finalize settlement permanently'}</button>;
}

export function SettlementForm({
  groupId, currency, balance, members, pendingCount,
}: {
  groupId: string;
  currency: string;
  balance: number;
  members: { id: string; name: string; role: string }[];
  pendingCount: number;
}) {
  const [state, action] = useActionState(finalizeSettlementAction.bind(null, groupId), initial);
  const [selectedIds, setSelectedIds] = useState(() => members.map(member => member.id));
  const selectedCount = selectedIds.length;
  const base = selectedCount ? Math.floor(balance / selectedCount) : 0;
  const remainder = selectedCount ? balance % selectedCount : 0;
  const selectedOrder = new Map(selectedIds.map((id, index) => [id, index]));

  return <form action={action} className="space-y-4">
    <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
      Finalizing settlement permanently closes this group's financial ledger. All pending contribution submissions must be reviewed first. Select the members who will receive an equal share of the remaining balance.
    </div>
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-bold text-slate-800">Eligible members</legend>
      {members.map(member => (
        <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <input type="checkbox" name="memberIds" value={member.id} checked={selectedIds.includes(member.id)} onChange={event => setSelectedIds(current => { const next = new Set(event.target.checked ? [...current, member.id] : current.filter(id => id !== member.id)); return members.filter(item => next.has(item.id)).map(item => item.id); })} className="size-4 accent-[#10243a]"/>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-800">{member.name}</span>
            <span className="block text-xs capitalize text-slate-400">{member.role.replace('_', ' ')}</span>
          </span>
          <span className="text-right text-xs font-semibold tabular-nums text-slate-600">
            {selectedOrder.has(member.id) ? formatMoney(base + ((selectedOrder.get(member.id) ?? selectedCount) < remainder ? 1 : 0), currency) : 'Not selected'}
          </span>
        </label>
      ))}
    </fieldset>
    <p className="text-xs text-slate-500">Estimated allocation for the {selectedCount} selected member(s). Any indivisible minor units are distributed one by one in the selected order. The database recalculates and validates the final amounts when you submit.</p>
    <label className="block text-sm font-medium text-slate-700">Settlement note (optional)
      <textarea name="note" rows={3} maxLength={500} className={field} placeholder="Add a final settlement note"/>
    </label>
    {pendingCount > 0 && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">There are {pendingCount} pending payment submissions. Review them before finalizing.</p>}
    {state.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}
    {state.success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{state.success}</p>}
    <SubmitButton/>
  </form>;
}
