import {
  ContributionForm,
  ManagerMemberContributionForm,
} from "@/components/finance/finance-forms";
import { FinancePageShell } from "@/components/navigation/finance-page-shell";
import { getFinanceContext } from "@/lib/finance/context";
import { formatMoney } from "@/lib/money";
export default async function SubmitContributionPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const d = await getFinanceContext(groupId);
  const mine = d.submissionRows.filter((r) => r.member_id === d.user.id);
  return (
    <FinancePageShell
      groupId={groupId}
      groupName={d.group.name}
      role={d.role}
      canManage={d.canManage}
      isManager={d.isManager}
      pendingCount={d.pendingRows.length}
      active="contribute"
      title="Submit a contribution"
      subtitle="Report a payment. It becomes official group income only after verification."
    >
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-slate-900">
            Submit Your Contribution
          </h2>
          <ContributionForm groupId={groupId} currency={d.currency} />
        </section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Expected standard contribution
          </p>
          <p className="mt-2 text-2xl font-bold text-[#10243a]">
            {formatMoney(d.standardMinor, d.currency)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            This is a reference amount set by the group manager. Submit the
            actual amount you paid.
          </p>
        </aside>
      </div>
      {d.canManage && (
        <section className="mt-5 rounded-2xl border border-[#e7c77e] bg-white p-4 sm:p-6">
          <h2 className="text-sm font-bold text-slate-900">
            Record A Contribution For A Member
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Use this when you, as the manager, have already received money from
            a member. Select the member below; the record will be added directly
            to the official balance.
          </p>
          <div className="mt-4">
            <ManagerMemberContributionForm
              groupId={groupId}
              currency={d.currency}
              members={d.members}
            />
          </div>
        </section>
      )}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-bold text-slate-900">
          Your Recent Submissions
        </h2>
        {mine.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {mine.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {d.personMap.get(r.member_id) || "TourLedger member"}
                  </p>
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {r.contribution_kind} contribution
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(r.submitted_at).toLocaleString()} · {r.status}
                  </p>
                </div>
                <p className="text-sm font-bold">
                  {formatMoney(r.amount_minor, d.currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            You have not submitted a payment yet.
          </p>
        )}
      </section>
    </FinancePageShell>
  );
}
