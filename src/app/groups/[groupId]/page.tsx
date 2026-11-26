import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  AddMemberForm,
  CreateInviteForm,
} from "@/components/groups/group-forms";
import { GroupDescription } from "@/components/groups/group-description";
import { deactivateMemberAction } from "@/app/groups/actions";
import { createClient } from "@/lib/supabase/server";
import { ContextBottomNav } from "@/components/navigation/context-bottom-nav";

type MemberRow = {
  user_id: string;
  role: "manager" | "assistant_manager" | "member";
  is_active: boolean;
  joined_at: string;
};

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group }, { data: myMembership }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("tour_groups")
        .select(
          "id, name, description, destination, start_date, end_date, currency_code, status, created_by",
        )
        .eq("id", groupId)
        .maybeSingle(),
      supabase
        .from("group_members")
        .select("role, is_active")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("group_members")
        .select("user_id, role, is_active, joined_at")
        .eq("group_id", groupId)
        .eq("is_active", true)
        .order("joined_at", { ascending: true }),
    ]);
  if (!group || !myMembership?.is_active) notFound();

  const members = (memberRows ?? []) as MemberRow[];
  const ids = members.map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids)
    : {
        data: [] as {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
        }[],
      };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const canManage =
    myMembership.role === "manager" ||
    myMembership.role === "assistant_manager";
  const isManager = myMembership.role === "manager";

  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-28 sm:pb-10">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-[#10243a] shadow-sm transition hover:bg-slate-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10243a] focus-visible:ring-offset-2"
            >
              <ArrowLeft size={21} />
            </Link>

            <Link
              href="/dashboard"
              className="text-lg font-bold text-[#10243a]"
            >
              TourLedger
            </Link>
          </div>

          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">
            {String(myMembership.role).replace("_", " ")}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 sm:py-8">
        <section className="mt-5 rounded-2xl bg-[#10243a] p-5 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{group.name}</h1>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-white/80">
                {group.status}
              </span>
              <GroupDescription
                description={group.description}
                fallback="A shared space for your tour planning and transparent finances."
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-5 text-sm text-white/75">
            {group.destination && (
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} />
                {group.destination}
              </span>
            )}
            {(group.start_date || group.end_date) && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={15} />
                {group.start_date || "TBD"} – {group.end_date || "TBD"}
              </span>
            )}
            <span>{group.currency_code} currency</span>
          </div>
        </section>

        {query.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {query.error}
          </p>
        )}

        <div className="mt-3">
          <Link
            href={`/groups/${groupId}/finances`}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e5bb68] px-4 py-3 text-[22px] font-semibold text-[#10243a] hover:bg-[#d9ad57] sm:inline-flex sm:w-auto"
          >
            <Wallet size={20} /> Open Group Finances
          </Link>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Group Members</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {members.length} active{" "}
                  {members.length === 1 ? "member" : "members"}
                </p>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-[#edf2f7] text-[#10243a]">
                <Users size={19} />
              </span>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
              {members.map((member) => {
                const profile = profileMap.get(member.user_id);
                const name = profile?.full_name || "TourLedger member";
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf2f7] text-xs font-bold text-[#10243a]">
                        {name
                          .split(" ")
                          .slice(0, 2)
                          .map((s: string) => s[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {name}
                          {member.user_id === user.id ? " (You)" : ""}
                        </p>
                        <p className="text-xs capitalize text-slate-500">
                          {member.role.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    {isManager && member.role !== "manager" && (
                      <form
                        action={deactivateMemberAction.bind(
                          null,
                          groupId,
                          member.user_id,
                        )}
                      >
                        <button className="text-xs font-medium text-rose-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="space-y-5">
            {canManage && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#b58a35]" />
                  <h2 className="font-bold text-slate-900">
                    Add Registered User
                  </h2>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Add someone who already has a TourLedger account using their
                  registered email address.
                </p>
                <div className="mt-4">
                  <AddMemberForm groupId={groupId} canPromote={isManager} />
                </div>
              </section>
            )}
            {canManage && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
                <h2 className="font-bold text-slate-900">Invite With A Link</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Create a time-limited invitation for people to join as
                  members. The invitation token is stored as a hash.
                </p>
                <div className="mt-4">
                  <CreateInviteForm groupId={groupId} />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
      <ContextBottomNav groupId={groupId} mode="group" />
    </main>
  );
}
