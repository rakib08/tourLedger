import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Link2 } from 'lucide-react';
import { AcceptInviteForm } from '@/components/groups/group-forms';
import { BackButton } from '@/components/navigation/back-button';
import { createClient } from '@/lib/supabase/server';

export default async function JoinGroupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-5"><div className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center"><h1 className="text-xl font-bold text-[#10243a]">Invalid Invitation</h1><p className="mt-2 text-sm text-slate-500">This invitation link does not appear to be valid.</p><Link href="/dashboard" className="mt-5 inline-block text-sm font-semibold text-[#10243a] underline">Go to dashboard</Link></div></main>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const next = `/join/${token}`;
  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#edf2f7] text-[#10243a]"><Link2 size={22}/></span><h1 className="mt-4 text-xl font-bold text-[#10243a]">You've Been Invited To A Tour Group</h1><p className="mt-2 text-sm leading-6 text-slate-500">Sign in or create a free TourLedger account to accept this invitation.</p><Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-6 block rounded-xl bg-[#10243a] px-4 py-3 text-sm font-semibold text-white">Sign in to join</Link><Link href={`/signup?next=${encodeURIComponent(next)}`} className="mt-3 block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#10243a]">Create an account</Link></section></main>;
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><BackButton href="/dashboard" label="Back to dashboard" /><span className="mx-auto mt-6 grid size-12 place-items-center rounded-xl bg-[#edf2f7] text-[#10243a]"><Link2 size={22}/></span><h1 className="mt-4 text-center text-xl font-bold text-[#10243a]">Join A Tour Group</h1><p className="mt-2 text-center text-sm leading-6 text-slate-500">You're signed in as {user.email}. Accept the invitation to become a member of this tour group.</p><div className="mt-6"><AcceptInviteForm token={token}/></div><p className="mt-4 text-center text-xs text-slate-400">Invitation links can expire or be revoked by the group managers.</p></section></main>;
}
