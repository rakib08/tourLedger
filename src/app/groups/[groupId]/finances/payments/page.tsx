import { notFound } from "next/navigation";
import { ReviewSubmissionForm } from "@/components/finance/finance-forms";
import { FinancePageShell } from "@/components/navigation/finance-page-shell";
import { getFinanceContext } from "@/lib/finance/context";
import { formatMoney } from "@/lib/money";
export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const d = await getFinanceContext(groupId);
  if (!d.canManage) notFound();
  return (
    <FinancePageShell
      groupId={groupId}
      groupName={d.group.name}
      role={d.role}
      canManage={d.canManage}
      isManager={d.isManager}
      pendingCount={d.pendingRows.length}
      active="payments"
      title="Payments Awaiting Verification"
      subtitle="Review submissions before they enter the official financial ledger."
    >
      <section className="mt-5 space-y-3">
        {d.pendingRows.length ? (
          d.pendingRows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {d.personMap.get(r.member_id) || "TourLedger member"}
                  </p>
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {r.contribution_kind} contribution ·{" "}
                    {r.payment_method.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(r.submitted_at).toLocaleString()}
                  </p>
                  {r.reference_note && (
                    <p className="mt-2 break-words text-xs text-slate-600">
                      Reference: {r.reference_note}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-base font-bold tabular-nums text-[#10243a]">
                  {formatMoney(r.amount_minor, d.currency)}
                </p>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <ReviewSubmissionForm groupId={groupId} submissionId={r.id} />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-800">
              You're all caught up
            </p>
            <p className="mt-1 text-xs text-slate-500">
              There are no payments awaiting verification.
            </p>
          </div>
        )}
      </section>
    </FinancePageShell>
  );
}
