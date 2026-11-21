import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ContextBottomNav } from '@/components/navigation/context-bottom-nav';

export function FinancePageShell({
  groupId, groupName, role, canManage, isManager, pendingCount = 0,
  active, title, subtitle, children,
}: {
  groupId: string;
  groupName: string;
  role: string;
  canManage: boolean;
  isManager: boolean;
  pendingCount?: number;
  active: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  const isOverview = active === 'overview';

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-28 sm:pb-10">
      <header className="app-safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={`/groups/${groupId}`} className="flex min-w-0 items-center gap-2 text-sm font-bold text-[#10243a]">
            <ArrowLeft size={18} /><span className="truncate">{groupName}</span>
          </Link>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">
            {role.replace('_', ' ')}
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {!isOverview && (
          <Link href={`/groups/${groupId}/finances`} className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#10243a]">
            <ArrowLeft size={16} /> Financial overview
          </Link>
        )}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#b58a35]">Group finances</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#10243a] sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
        </div>
        {children}
      </div>
      <ContextBottomNav groupId={groupId} mode="finance" />
    </main>
  );
}
