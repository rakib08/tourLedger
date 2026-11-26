import Link from "next/link";
import { BackButton } from "@/components/navigation/back-button";
import { ContextBottomNav } from "@/components/navigation/context-bottom-nav";

export function FinancePageShell({
  groupId,
  groupName,
  role,
  canManage,
  isManager,
  pendingCount = 0,
  active,
  title,
  subtitle,
  children,
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
  const isOverview = active === "overview";
  const backHref = isOverview
    ? `/groups/${groupId}`
    : `/groups/${groupId}/finances`;
  const backLabel = isOverview
    ? "Back to group details"
    : "Back to financial overview";

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-28 sm:pb-10">
      <header className="app-safe-top sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <BackButton href={backHref} label={backLabel} />
          <Link
            href={`/groups/${groupId}`}
            className="min-w-0 flex-1 truncate text-sm font-bold text-[#10243a] hover:text-[#29445f]"
          >
            {groupName}
          </Link>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">
            {role.replace("_", " ")}
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6 sm:py-8">
        <div className="mb-5">
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#10243a] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
        </div>
        {children}
      </div>
      <ContextBottomNav groupId={groupId} mode="finance" />
    </main>
  );
}
