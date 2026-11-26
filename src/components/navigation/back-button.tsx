import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackButton({
  href,
  label,
  className = '',
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#10243a] shadow-[0_1px_2px_rgba(16,36,58,0.04)] transition-colors hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#10243a] ${className}`}
    >
      <ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" />
    </Link>
  );
}
