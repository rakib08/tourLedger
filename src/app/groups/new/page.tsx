import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreateGroupForm } from '@/components/groups/group-forms';
import { ContextBottomNav } from '@/components/navigation/context-bottom-nav';
import { BackButton } from '@/components/navigation/back-button';

export default async function NewGroupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <main className="min-h-[100dvh] bg-[#f5f7fa] px-4 py-5 pb-28 sm:py-8">
    <div className="mx-auto max-w-2xl">
      <BackButton href="/dashboard" label="Back to dashboard" />
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#b58a35]">New tour workspace</p>
        <h1 className="mt-2 text-2xl font-bold text-[#10243a]">Create A Tour Group</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">You'll become the manager of this group. You can invite registered TourLedger users and appoint assistant managers after creation.</p>
        <div className="mt-7"><CreateGroupForm/></div>
      </section>
    </div>
    <ContextBottomNav mode="dashboard"/>
  </main>;
}
