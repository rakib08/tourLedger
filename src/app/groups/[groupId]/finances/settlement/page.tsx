import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FinancePageShell } from '@/components/navigation/finance-page-shell';
import { SettlementForm } from '@/components/finance/settlement-form';
import { getFinanceContext } from '@/lib/finance/context';
import { formatMoney } from '@/lib/money';

export default async function GroupSettlementPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const d = await getFinanceContext(groupId);
  const supabase = await createClient();
  const { data: settlement } = await supabase.from('settlements')
    .select('id,total_refund_minor,finalized_at,finalized_by,note')
    .eq('group_id',groupId).maybeSingle();

  if (settlement) {
    const { data: allocations } = await supabase.from('settlement_allocations')
      .select('member_id,amount_minor').eq('settlement_id',settlement.id);
    const ids = (allocations ?? []).map(row => row.member_id);
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('id,full_name').in('id',ids)
      : { data: [] as {id:string;full_name:string|null}[] };
    const names = new Map((profiles ?? []).map(profile => [profile.id,profile.full_name || 'TourLedger member']));
    const managerName = d.personMap.get(settlement.finalized_by) || 'Group manager';
    return (
      <FinancePageShell groupId={groupId} groupName={d.group.name} role={d.role} canManage={d.canManage} isManager={d.isManager} pendingCount={d.pendingRows.length} active="settlement" title="Final Settlement" subtitle="The finalized refund allocation snapshot for this group.">
        <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Settlement finalized</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-950">{formatMoney(Number(settlement.total_refund_minor),d.currency)}</p>
          <p className="mt-1 text-xs text-emerald-800">Finalized by {managerName} · {new Date(settlement.finalized_at).toLocaleString()}</p>
          {settlement.note && <p className="mt-3 text-sm text-emerald-900">{settlement.note}</p>}
        </section>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-900">Member Refund Allocations</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {(allocations ?? []).map(row => <div key={row.member_id} className="flex items-center justify-between gap-3 py-3"><p className="text-sm font-medium text-slate-700">{names.get(row.member_id) || 'Group member'}</p><p className="text-sm font-bold tabular-nums text-emerald-700">{formatMoney(Number(row.amount_minor),d.currency)}</p></div>)}
          </div>
        </section>
        <p className="mt-4 text-xs leading-5 text-slate-500">This is an immutable snapshot. Finalized allocations cannot be edited or deleted, and the group's financial ledger is locked.</p>
      </FinancePageShell>
    );
  }

  if (d.group.status === 'completed' || d.group.status === 'archived') {
    return <FinancePageShell groupId={groupId} groupName={d.group.name} role={d.role} canManage={d.canManage} isManager={d.isManager} pendingCount={d.pendingRows.length} active="settlement" title="Settlement" subtitle="Settlement status for this group."><p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This group is closed, but no final settlement record was found.</p></FinancePageShell>;
  }

  return (
    <FinancePageShell groupId={groupId} groupName={d.group.name} role={d.role} canManage={d.canManage} isManager={d.isManager} pendingCount={d.pendingRows.length} active="settlement" title="Settlement & equal refunds" subtitle="Choose the members who will share the remaining group balance equally.">
      <section className="mt-5 rounded-2xl bg-[#10243a] p-4 text-white"><p className="text-xs text-white/70">Available balance</p><p className="mt-2 text-2xl font-bold tabular-nums">{formatMoney(d.balance,d.currency)}</p><p className="mt-1 text-xs text-white/60">Calculated from all posted ledger entries.</p></section>
      {d.isManager ? (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-base font-bold text-slate-900">Finalize Group Settlement</h2>
          <SettlementForm groupId={groupId} currency={d.currency} balance={d.balance} members={d.members} pendingCount={d.pendingRows.length}/>
        </section>
      ) : <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">The group manager has not finalized settlement yet.</p>}
    </FinancePageShell>
  );
}
