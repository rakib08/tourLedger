"use client";
import { useActionState, useMemo, useState } from "react";
import { voidTransactionAction, type FinanceActionState } from "@/app/groups/finance-actions";
import { formatMoney, currencyFractionDigits } from "@/lib/money";
type Tx = {
  id: string;
  type: string;
  contribution_kind: string | null;
  member_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  amount_minor: number;
  occurred_at: string;
  status: string;
};
export function TransactionExplorer({
  rows,
  people,
  categories,
  currency,
  isManager,
  groupId,
}: {
  rows: Tx[];
  people: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  currency: string;
  isManager: boolean;
  groupId: string;
}) {
  const [type, setType] = useState("all"),
    [contribution, setContribution] = useState("all"),
    [member, setMember] = useState("all"),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("newest");
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (type === "all" || r.type === type) &&
            (contribution === "all" || r.contribution_kind === contribution) &&
            (member === "all" || r.member_id === member) &&
            (category === "all" || r.category_id === category) &&
            (status === "all" || r.status === status) &&
            (!from || r.occurred_at.slice(0, 10) >= from) &&
            (!to || r.occurred_at.slice(0, 10) <= to) &&
            (!min ||
              r.amount_minor >=
                Number(min) * 10 ** currencyFractionDigits(currency)) &&
            (!max ||
              r.amount_minor <=
                Number(max) * 10 ** currencyFractionDigits(currency)) &&
            `${r.title} ${r.description || ""} ${people.find((p) => p.id === r.member_id)?.name || ""} ${categories.find((c) => c.id === r.category_id)?.name || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "newest"
            ? b.occurred_at.localeCompare(a.occurred_at)
            : sort === "oldest"
              ? a.occurred_at.localeCompare(b.occurred_at)
              : sort === "highest"
                ? b.amount_minor - a.amount_minor
                : a.amount_minor - b.amount_minor,
        ),
    [
      rows,
      type,
      contribution,
      member,
      category,
      status,
      from,
      to,
      min,
      max,
      search,
      sort,
      people,
      categories,
    ],
  );
  const clear = () => {
    setType("all");
    setContribution("all");
    setMember("all");
    setCategory("all");
    setStatus("all");
    setFrom("");
    setTo("");
    setMin("");
    setMax("");
    setSearch("");
    setSort("newest");
  };
  const total = filtered
    .filter((r) => r.status === "posted")
    .reduce(
      (s, r) => s + (r.type === "expense" ? -r.amount_minor : r.amount_minor),
      0,
    );
  return (
    <>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, member, category or description"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border p-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="contribution">Contributions</option>
            <option value="expense">Expenses</option>
            <option value="refund">Refunds</option>
          </select>
          <select
            value={member}
            onChange={(e) => setMember(e.target.value)}
            className="rounded-lg border p-2 text-sm"
          >
            <option value="all">All Members</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border p-2 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border p-2 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {filtered.length} matching transactions · Posted net:{" "}
            {formatMoney(total, currency)}
          </p>
          <button
            onClick={clear}
            className="text-xs font-semibold text-blue-700"
          >
            Clear All Filters
          </button>
        </div>
      </section>
      <section className="mt-4 space-y-3">
        {filtered.map((r) => (
          <article
            key={r.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-slate-900">
                  {r.type === "contribution"
                    ? people.find((p) => p.id === r.member_id)?.name || "Member"
                    : r.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {r.type === "contribution"
                    ? `${r.contribution_kind || ""} contribution`
                    : r.type}{" "}
                  · {new Date(r.occurred_at).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {categories.find((c) => c.id === r.category_id)?.name || ""}{" "}
                  {r.status === "voided" ? "· Voided" : ""}
                </p>
                {r.description && (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{r.description}</p>
                )}
              </div>
              <p
                className={`shrink-0 text-sm font-bold ${r.type === "expense" ? "text-rose-700" : "text-emerald-700"}`}
              >
                {r.type === "expense" ? "−" : "+"}
                {formatMoney(r.amount_minor, currency)}
              </p>
            </div>
            {isManager && r.status === "posted" && (
              <VoidTransactionControl
                groupId={groupId}
                transactionId={r.id}
              />
            )}
            {r.status === "voided" && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                This transaction has been voided and is excluded from the group balance.
              </p>
            )}
          </article>
        ))}
        {!filtered.length && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
            No transactions match these filters.
          </p>
        )}
      </section>
    </>
  );
}


function VoidTransactionControl({
  groupId,
  transactionId,
}: {
  groupId: string;
  transactionId: string;
}) {
  const action = voidTransactionAction.bind(null, groupId, transactionId);
  const [state, formAction, pending] = useActionState<FinanceActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="mt-4 border-t border-slate-100 pt-3">
      <label
        htmlFor={`void-reason-${transactionId}`}
        className="mb-2 block text-xs font-medium text-slate-600"
      >
        Void reason
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`void-reason-${transactionId}`}
          name="reason"
          required
          minLength={3}
          maxLength={300}
          placeholder="Reason for correction"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#10243a] focus:ring-2 focus:ring-[#10243a]/10"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Voiding…" : "Void"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mt-2 text-xs text-emerald-700">
          {state.success}
        </p>
      )}
      <p className="mt-2 text-[11px] leading-5 text-slate-400">
        Voiding preserves the audit record but removes this transaction from financial totals.
      </p>
    </form>
  );
}
