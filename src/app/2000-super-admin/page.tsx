import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approveGroupAction, rejectGroupAction } from "./actions";
import { DeleteGroupButton } from "./delete-group-button";
import { UserCreateForm } from "./user-create-form";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin, error: adminError } =
    await supabase.rpc("is_super_admin");
  if (adminError || isAdmin !== true) redirect("/dashboard");

  const { data: groups, error } = await supabase
    .from("tour_groups")
    .select(
      "id, name, destination, created_by, created_at, approval_status, status",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#b58a35]">
              TourLedger Administration
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#10243a]">
              Super Admin
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Review new group requests and manage existing groups.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-[#10243a] underline"
          >
            Dashboard
          </Link>
        </div>
        {query.error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {query.error}
          </p>
        )}
        {query.notice && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {query.notice}
          </p>
        )}
        <UserCreateForm />{" "}
        {error ? (
          <p className="mt-6 rounded-xl bg-white p-5 text-sm text-rose-700">
            Could not load groups: {error.message}
          </p>
        ) : (
          <section className="mt-7 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Group Requests And Groups
            </h2>
            {(groups ?? []).length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No group requests or groups found.
              </div>
            ) : (
              groups!.map((group) => (
                <article
                  key={group.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#10243a]">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.destination || "Destination Not Set"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Requested By: {group.created_by}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Submitted: {new Date(group.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                      {group.approval_status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.approval_status === "pending" && (
                      <>
                        <form action={approveGroupAction}>
                          <input
                            type="hidden"
                            name="groupId"
                            value={group.id}
                          />
                          <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">
                            Approve
                          </button>
                        </form>
                        <form action={rejectGroupAction}>
                          <input
                            type="hidden"
                            name="groupId"
                            value={group.id}
                          />
                          <button className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700">
                            Reject
                          </button>
                        </form>
                      </>
                    )}
                    <DeleteGroupButton groupId={group.id} />
                  </div>
                </article>
              ))
            )}
          </section>
        )}
      </div>
    </main>
  );
}
