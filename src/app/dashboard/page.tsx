import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus, Users, Wallet } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { ContextBottomNav } from "@/components/navigation/context-bottom-nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-5">
        <section className="max-w-xl rounded-2xl border border-amber-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold text-[#10243a]">
            Connect Your Supabase Project
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            your local .env.local file, then restart the development server.
            Your environment file is intentionally not included in the
            downloadable project ZIP.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-[#10243a] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to sign in
          </Link>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: groups, error: groupsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("tour_groups")
        .select(
          "id, name, destination, start_date, end_date, status, approval_status",
        )
        .order("created_at", { ascending: false }),
    ]);

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "TourLedger user";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#f5f7fa] pb-28 sm:pb-10">
      <header className="app-safe-top border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#10243a] text-[#e5bb68]">
              <Wallet size={21} />
            </span>
            <span className="text-lg font-bold text-[#10243a]">TourLedger</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-[#e9eef5] text-xs font-bold text-[#10243a]">
              {initials || "TL"}
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {displayName}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>

            <form action={signOutAction}>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main page content */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-1 sm:px-6 sm:py-9">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#10243a] sm:text-3xl">
              Hello, {displayName.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your trips and keep shared finances transparent.
            </p>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Your Tour Groups
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Groups you manage or have joined.
              </p>
            </div>

            <Link
              href="/groups/new"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#10243a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#193956]"
            >
              <Plus size={16} /> Create Group
            </Link>
          </div>

          {groupsError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              The group list could not be loaded. Confirm that the database
              migration has been applied in Supabase.
            </div>
          ) : groups && groups.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(
                (group: {
                  id: string;
                  name: string;
                  destination: string | null;
                  start_date: string | null;
                  end_date: string | null;
                  status: string;
                  approval_status: string;
                }) => (
                  <Link
                    href={
                      group.approval_status === "approved"
                        ? `/groups/${group.id}`
                        : "/dashboard"
                    }
                    key={group.id}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid size-10 place-items-center rounded-xl bg-[#edf2f7] text-[#10243a]">
                        <CalendarDays size={19} />
                      </span>

                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                        {group.status}
                      </span>
                    </div>

                    <h3 className="mt-4 font-bold text-slate-900">
                      {group.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {group.destination || "Destination not set"}
                    </p>

                    <p className="mt-4 text-xs text-slate-400">
                      {group.start_date || "Date not set"}
                      {group.end_date ? ` – ${group.end_date}` : ""}
                    </p>

                    <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      {group.approval_status === "approved"
                        ? "Open group finances and view the shared ledger."
                        : group.approval_status === "pending"
                          ? "Your request is awaiting Super Admin approval."
                          : "This group request was rejected."}
                    </p>
                  </Link>
                ),
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf2f7] text-[#10243a]">
                <Plus size={25} />
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Your First Trip Starts Here
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Create a group to organize members, invitations, contributions
                and shared trip expenses.
              </p>

              <Link
                href="/groups/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#10243a] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={16} /> Create your first group
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Footer stays at the bottom, just above bottom navigation */}
      <footer className="mt-auto px-4 pb-3 pt-4 text-center">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} TourLedger. All rights reserved.
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Developed by{" "}
          <Link
            href="https://www.linkedin.com/in/rakib-uddin-r8/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#10243a] transition-colors hover:text-[#c49a45] hover:underline"
          >
            Rakib Uddin
          </Link>
        </p>
      </footer>

      {/* Bottom navigation - render only once */}
      <ContextBottomNav mode="dashboard" />
    </main>
  );
}
