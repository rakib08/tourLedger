import {notFound} from 'next/navigation';
import {ExpenseForm} from '@/components/finance/finance-forms';
import {FinancePageShell} from '@/components/navigation/finance-page-shell';
import {getFinanceContext} from '@/lib/finance/context';
export default async function NewGroupExpensePage({params}:{params:Promise<{groupId:string}>}){const {groupId}=await params;const d=await getFinanceContext(groupId);if(!d.canManage)notFound();return <FinancePageShell groupId={groupId} groupName={d.group.name} role={d.role} canManage={d.canManage} isManager={d.isManager} pendingCount={d.pendingRows.length} active="expense" title="Record a group expense" subtitle="Only managers and assistant managers can record official expenses."><section className="mt-5 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"><ExpenseForm groupId={groupId} currency={d.currency} categories={d.categories}/></section></FinancePageShell>}
