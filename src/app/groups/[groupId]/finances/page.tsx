import Link from 'next/link';
import { BadgeCheck, CircleDollarSign, Clock3, ReceiptText, Wallet, ArrowUpRight, Settings2, BarChart3, HandCoins } from 'lucide-react';
import { getFinanceContext } from '@/lib/finance/context';
import { formatMoney } from '@/lib/money';
import { FinancePageShell } from '@/components/navigation/finance-page-shell';

export default async function GroupFinancesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const d = await getFinanceContext(groupId);

  const quickActions = [
    { href: 'contribute', label: 'Submit a contribution', description: 'Report a standard or additional payment', icon: Wallet },
    ...(d.canManage ? [{ href: 'expenses/new', label: 'Record a group expense', description: 'Add an official group expense', icon: ReceiptText }] : []),
  ];
  const management = [
    ...(d.isManager ? [{ href: 'settings', label: 'Standard contribution setting', description: 'Set the expected amount per member', icon: Settings2 }] : []),
    ...(d.canManage ? [{ href: 'payments', label: 'Payments awaiting verification', description: 'Review member payment submissions', icon: BadgeCheck, count: d.pendingRows.length }] : []),
    { href: 'transactions', label: 'Transaction history', description: 'Browse the official financial ledger', icon: Clock3 },
    { href: 'reports', label: 'Financial reports', description: 'Member contributions and expense breakdowns', icon: BarChart3 },
    { href: 'settlement', label: 'Settlement & equal refunds', description: 'View or finalize the group refund allocation', icon: HandCoins },
  ];

  return (
    <FinancePageShell
      groupId={groupId}
      groupName={d.group.name}
      role={d.role}
      canManage={d.canManage}
      isManager={d.isManager}
      pendingCount={d.pendingRows.length}
      active="overview"
      title="Financial overview"
      subtitle="Your group’s financial position and quick access to every finance task."
    >
      <section className="mt-5 rounded-2xl bg-[#10243a] p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Available balance</p>
          <Wallet size={20} className="text-[#e5bb68]" />
        </div>
        <p className="mt-3 break-words text-2xl font-bold tabular-nums sm:text-3xl">{formatMoney(d.balance, d.currency)}</p>
        <p className="mt-1 text-xs text-white/60">Verified income less expenses</p>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Link href={`/groups/${groupId}/finances/contributions`} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 active:scale-[.99]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Total contributions</p>
            <CircleDollarSign size={17} className="text-[#b58a35]" />
          </div>
          <p className="mt-2 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatMoney(d.totalIncome, d.currency)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Verified payments only · View all</p>
        </Link>
        <Link href={`/groups/${groupId}/finances/expenses`} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 active:scale-[.99]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Total expenses</p>
            <ReceiptText size={17} className="text-[#b58a35]" />
          </div>
          <p className="mt-2 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{formatMoney(d.totalExpenses, d.currency)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Posted expenses · View all</p>
        </Link>
        {d.canManage && (
          <Link href={`/groups/${groupId}/finances/payments`} className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 active:scale-[.99] sm:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">Pending payments</p>
              <BadgeCheck size={17} className="text-[#b58a35}" />
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">{d.pendingRows.length}</p>
            <p className="mt-1 text-[11px] text-slate-400">Tap to review submissions</p>
          </Link>
        )}
      </section>

      <section className="mt-7">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
          <p className="mt-1 text-xs text-slate-500">Common financial tasks.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickActions.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={`/groups/${groupId}/finances/${item.href}`} className="flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 active:scale-[.99]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#10243a]"><Icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                </span>
                <ArrowUpRight size={17} className="shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">Financial Management</h2>
          <p className="mt-1 text-xs text-slate-500">Open a dedicated page to manage your group finances.</p>
        </div>
        <div className="space-y-3">
          {management.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={`/groups/${groupId}/finances/${item.href}`} className="flex min-h-[84px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 active:scale-[.99]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-[#10243a]"><Icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                </span>
                {'count' in item && typeof item.count === 'number' && item.count > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{item.count}</span>}
                <ArrowUpRight size={17} className="shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
            <p className="mt-1 text-xs text-slate-500">Latest official financial records</p>
          </div>
          <Link href={`/groups/${groupId}/finances/transactions`} className="min-h-10 inline-flex items-center text-xs font-semibold text-[#10243a]">View all</Link>
        </div>
        {d.txRows.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {d.txRows.slice(0, 4).map(row => (
              <div key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.type === 'contribution' ? (row.member_id ? d.personMap.get(row.member_id) || 'TourLedger member' : 'Member not specified') : row.title}</p>
                  <p className="mt-1 text-xs capitalize text-slate-400">{row.type === 'contribution' ? `${row.contribution_kind || 'Contribution'} contribution` : row.type} · {new Date(row.occurred_at).toLocaleDateString()}</p>
                </div>
                <p className={`shrink-0 text-sm font-bold tabular-nums ${row.type === 'expense' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {row.type === 'expense' ? '−' : '+'}{formatMoney(row.amount_minor, d.currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No transactions recorded yet.</p>
        )}
      </section>
    </FinancePageShell>
  );
}
