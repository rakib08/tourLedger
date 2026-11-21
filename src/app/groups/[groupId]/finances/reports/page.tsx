import { FinancePageShell } from '@/components/navigation/finance-page-shell';
import { getFinanceContext } from '@/lib/finance/context';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/money';
import { PdfReportControls } from '@/components/finance/pdf-report-controls';

type MemberReport = { member_id: string; member_name: string; role: string; contribution_total: number; standard_total: number; additional_total: number; contribution_count: number };
type CategoryReport = { category_id: string | null; category_name: string; total_minor: number; expense_count: number };
type MonthlyReport = { month: string; contributions: number; expenses: number };
type ReportData = { members: MemberReport[]; categories: CategoryReport[]; monthly: MonthlyReport[] };

export default async function FinancialReportsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const d = await getFinanceContext(groupId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_group_financial_report', { p_group_id: groupId });
  const report = (data || { members: [], categories: [], monthly: [] }) as ReportData;
  const maxCategory = Math.max(1, ...report.categories.map(row => Number(row.total_minor)));
  const maxMonthly = Math.max(1, ...report.monthly.flatMap(row => [Number(row.contributions), Number(row.expenses)]));

  return (
    <FinancePageShell groupId={groupId} groupName={d.group.name} role={d.role} canManage={d.canManage} isManager={d.isManager} pendingCount={d.pendingRows.length} active="reports" title="Financial Reports" subtitle="Member-wise contribution history, expense breakdowns and monthly financial trends.">
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Report data could not be loaded. Apply migration 0005 and try again.</p>}
      {d.canManage && <PdfReportControls groupId={groupId} />}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total contributions</p><p className="mt-2 text-lg font-bold text-slate-900">{formatMoney(d.totalIncome,d.currency)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Total expenses</p><p className="mt-2 text-lg font-bold text-slate-900">{formatMoney(d.totalExpenses,d.currency)}</p></div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900">Member-wise Contribution History</h2>
        <p className="mt-1 text-xs text-slate-500">Posted contributions only, separated into standard and additional payments.</p>
        <div className="mt-4 space-y-3">
          {report.members.map(member => (
            <article key={member.member_id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{member.member_name}</p><p className="mt-1 text-xs capitalize text-slate-400">{member.role.replace('_',' ')} · {member.contribution_count} payments</p></div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-emerald-700">{formatMoney(Number(member.contribution_total),d.currency)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>Standard: {formatMoney(Number(member.standard_total),d.currency)}</span><span>Additional: {formatMoney(Number(member.additional_total),d.currency)}</span></div>
            </article>
          ))}
          {!report.members.length && <p className="text-sm text-slate-500">No active members found.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900">Expense Category Breakdown</h2>
        <p className="mt-1 text-xs text-slate-500">Posted expenses grouped by category.</p>
        <div className="mt-4 space-y-4">
          {report.categories.map((category,index) => <div key={category.category_id || `category-${index}`}>
            <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{category.category_name}</span><span className="font-semibold tabular-nums text-slate-800">{formatMoney(Number(category.total_minor),d.currency)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#b58a35]" style={{width:`${Math.max(0,Math.min(100,Number(category.total_minor)/maxCategory*100))}%`}}/></div>
            <p className="mt-1 text-[11px] text-slate-400">{category.expense_count} expenses</p>
          </div>)}
          {!report.categories.length && <p className="text-sm text-slate-500">No expense categories or posted expenses found.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900">Monthly Income Vs Expenses</h2>
        <p className="mt-1 text-xs text-slate-500">A month-by-month view of posted contributions and expenses.</p>
        <div className="mt-4 space-y-4">
          {report.monthly.map(row => <div key={row.month}>
            <p className="mb-2 text-sm font-semibold text-slate-700">{new Date(`${row.month}-01T00:00:00`).toLocaleDateString('en',{month:'long',year:'numeric'})}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><span className="w-24 shrink-0 text-[11px] text-slate-500">Contributions</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{width:`${Number(row.contributions)/maxMonthly*100}%`}}/></div><span className="w-24 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-700">{formatMoney(Number(row.contributions),d.currency)}</span></div>
              <div className="flex items-center gap-2"><span className="w-24 shrink-0 text-[11px] text-slate-500">Expenses</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-600" style={{width:`${Number(row.expenses)/maxMonthly*100}%`}}/></div><span className="w-24 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-700">{formatMoney(Number(row.expenses),d.currency)}</span></div>
            </div>
          </div>)}
          {!report.monthly.length && <p className="text-sm text-slate-500">No monthly financial activity yet.</p>}
        </div>
      </section>
    </FinancePageShell>
  );
}
