import { FinancePageShell } from '@/components/navigation/finance-page-shell';
import { getFinanceContext } from '@/lib/finance/context';
import { TransactionExplorer } from '@/components/finance/transaction-explorer';
export default async function TransactionsPage({params}:{params:Promise<{groupId:string}>}){
 const {groupId}=await params;const d=await getFinanceContext(groupId);
 return <FinancePageShell groupId={groupId} groupName={d.group.name} role={d.role} canManage={d.canManage} isManager={d.isManager} pendingCount={d.pendingRows.length} active="transactions" title="Transaction History" subtitle="Search, filter and sort the official financial ledger.">
 <TransactionExplorer rows={d.txRows} people={d.members.map(m=>({id:m.id,name:m.name}))} categories={d.categories} currency={d.currency} canManage={d.canManage} groupId={groupId}/>
 <p className="mt-4 text-xs leading-5 text-slate-400">Only posted transactions affect the available balance. Voided transactions remain in the audit history and are excluded from financial reports.</p>
 </FinancePageShell>;
}
