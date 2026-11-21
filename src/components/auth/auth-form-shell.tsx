import Link from 'next/link';
import { Wallet } from 'lucide-react';

export function AuthFormShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fa] px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-6 flex items-center justify-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#10243a] text-[#e5bb68]"><Wallet size={23} /></span>
          <span className="text-xl font-bold tracking-tight text-[#10243a]">TourLedger</span>
        </Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#10243a]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>
        <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        <p className="mt-8 text-center text-xs text-slate-400">Transparent group trip accounting</p>
      </div>
    </main>
  );
}
