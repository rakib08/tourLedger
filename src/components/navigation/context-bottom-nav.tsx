'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Wallet } from 'lucide-react';

export function ContextBottomNav({ groupId, mode = 'group' }: { groupId?: string; mode?: 'dashboard' | 'group' | 'finance' }) {
  const pathname = usePathname();
  const items = mode === 'dashboard'
    ? [{ href: '/dashboard', label: 'Home', icon: LayoutDashboard }, { href: '/groups/new', label: 'New group', icon: Users }]
    : groupId
      ? [{ href: `/groups/${groupId}`, label: 'Group', icon: Users }, { href: `/groups/${groupId}/finances`, label: 'Finances', icon: Wallet }, { href: '/dashboard', label: 'Home', icon: LayoutDashboard }]
      : [{ href: '/dashboard', label: 'Home', icon: LayoutDashboard }];
  return <nav aria-label="Main navigation" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pt-2 backdrop-blur-lg sm:hidden">
    <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/');
        return <Link key={href} href={href} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${active ? 'text-[#10243a]' : 'text-slate-400'}`} aria-current={active ? 'page' : undefined}>
          <Icon size={20} strokeWidth={active ? 2.5 : 1.8}/><span>{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
