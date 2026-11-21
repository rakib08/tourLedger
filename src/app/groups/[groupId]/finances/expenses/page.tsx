import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FinancePageShell } from '@/components/navigation/finance-page-shell';
import { getFinanceContext } from '@/lib/finance/context';
import { formatMoney } from '@/lib/money';

const PAGE_SIZE = 30;

export default async function TotalExpensesPage({
  params, searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const d = await getFinanceContext(groupId);
  const requestedPage = Number.parseInt(query.page || '1', 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const supabase = await createClient();
  const { data: rows, count } = await supabase
    .from('financial_transactions')
    .select('id, title, description, amount_minor, category_id, occurred_at, status', { count: 'exact' })
    .eq('group_id', groupId)
    .eq('type', 'expense')
    .order('occurred_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const entries = rows ?? [];
  const categoryMap = new Map(d.categories.map(category => [category.id, category.name]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <FinancePageShell groupId={groupId} groupName={d.group.name} role={d.role} canManage={d.canManage} isManager={d.isManager} pendingCount={d.pendingRows.length} active="expenses" title="Total Expenses" subtitle="All group expense records, including voided entries retained for audit history.">
      <section className="mt-5 space-y-3">
        <div className="rounded-2xl bg-[#10243a] p-4 text-white">
          <p className="text-xs text-white/70">Posted expenses total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(d.totalExpenses, d.currency)}</p>
          <p className="mt-1 text-xs text-white/60">{count ?? 0} expense records</p>
        </div>
        {entries.length ? entries.map(row => (
          <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-sm font-bold text-slate-900">{row.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${row.status === 'voided' ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-700'}`}>{row.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{row.category_id ? categoryMap.get(row.category_id) || 'Category' : 'Uncategorized'}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(row.occurred_at).toLocaleString()}</p>
                {row.description && <p className="mt-2 whitespace-pre-line break-words text-xs leading-5 text-slate-500">{row.description}</p>}
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-rose-700">{formatMoney(Number(row.amount_minor), d.currency)}</p>
            </div>
          </article>
        )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No expenses have been recorded yet.</div>}
        {totalPages > 1 && (
          <nav aria-label="Expense pages" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
            {page > 1 ? <Link className="min-h-10 inline-flex items-center px-3 text-sm font-semibold text-[#10243a]" href={`/groups/${groupId}/finances/expenses?page=${page - 1}`}>Previous</Link> : <span className="px-3 text-sm text-slate-300">Previous</span>}
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            {page < totalPages ? <Link className="min-h-10 inline-flex items-center px-3 text-sm font-semibold text-[#10243a]" href={`/groups/${groupId}/finances/expenses?page=${page + 1}`}>Next</Link> : <span className="px-3 text-sm text-slate-300">Next</span>}
          </nav>
        )}
      </section>
    </FinancePageShell>
  );
}
