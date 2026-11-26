"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { currencyFractionDigits } from "@/lib/money";
import {
  recordExpenseAction,
  recordMemberContributionAction,
  reviewContributionAction,
  submitContributionAction,
  updateStandardContributionAction,
  voidTransactionAction,
  type FinanceActionState,
} from "@/app/groups/finance-actions";

const initial: FinanceActionState = {};
const input =
  "mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base outline-none focus:border-[#10243a] focus:ring-2 focus:ring-[#10243a]/10";

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="min-h-12 w-full rounded-xl bg-[#10243a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#193956] disabled:opacity-60"
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LoadingSpinner size={17} className="text-white" />
          Please wait…
        </span>
      ) : (
        children
      )}
    </button>
  );
}
function Feedback({ state }: { state: FinanceActionState }) {
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {state.success}
        </p>
      )}
    </>
  );
}

export function ContributionForm({
  groupId,
  currency,
}: {
  groupId: string;
  currency: string;
}) {
  const digits = currencyFractionDigits(currency);
  const [state, action] = useActionState(
    submitContributionAction.bind(null, groupId),
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Contribution type
        <select name="kind" className={input}>
          <option value="standard">Standard Contribution</option>
          <option value="additional">Additional Contribution</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Amount ({currency})
        <input
          name="amount"
          type="number"
          min={digits === 0 ? "1" : "0.01"}
          step={
            digits === 0 ? "1" : `0.${"0".repeat(Math.max(0, digits - 1))}1`
          }
          required
          placeholder="Enter amount"
          className={input}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Payment date (optional)
        <input name="occurredAt" type="date" className={input} />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Leave blank to use the date you submit this payment.
        </span>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Payment method
        <select name="paymentMethod" className={input}>
          <option value="cash">Cash</option>
          <option value="mobile_banking">Mobile Banking</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Transaction/reference note (optional)
        <input
          name="referenceNote"
          maxLength={240}
          placeholder="Transaction ID or short note"
          className={input}
        />
      </label>
      <Feedback state={state} />
      <Submit>Submit payment</Submit>
    </form>
  );
}

export function ManagerMemberContributionForm({
  groupId,
  currency,
  members,
}: {
  groupId: string;
  currency: string;
  members: { id: string; name: string; role: string }[];
}) {
  const digits = currencyFractionDigits(currency);
  const [state, action] = useActionState(
    recordMemberContributionAction.bind(null, groupId),
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Member who gave the money
        <select name="memberId" required className={input}>
          <option value="">Select A Group Member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} · {member.role.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Contribution type
        <select name="kind" className={input}>
          <option value="standard">Standard Contribution</option>
          <option value="additional">Additional Contribution</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Amount ({currency})
        <input
          name="amount"
          type="number"
          min={digits === 0 ? "1" : "0.01"}
          step={
            digits === 0 ? "1" : `0.${"0".repeat(Math.max(0, digits - 1))}1`
          }
          required
          placeholder="Enter amount"
          className={input}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Payment date (optional)
        <input name="occurredAt" type="date" className={input} />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Leave blank to use today’s date.
        </span>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Payment method
        <select name="paymentMethod" className={input}>
          <option value="cash">Cash</option>
          <option value="mobile_banking">Mobile Banking</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Reference note (optional)
        <input
          name="referenceNote"
          maxLength={240}
          placeholder="Transaction ID or short note"
          className={input}
        />
      </label>
      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
        Use this when the managers has already received the money. The
        contribution is posted directly to the group ledger without a separate
        approval step.
      </p>
      <Feedback state={state} />
      <Submit>Record Contribution</Submit>
    </form>
  );
}

export function ExpenseForm({
  groupId,
  currency,
  categories,
}: {
  groupId: string;
  currency: string;
  categories: { id: string; name: string }[];
}) {
  const digits = currencyFractionDigits(currency);
  const [state, action] = useActionState(
    recordExpenseAction.bind(null, groupId),
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Expense title
        <input
          name="title"
          required
          maxLength={140}
          placeholder="e.g. Hotel booking"
          className={input}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Amount ({currency})
        <input
          name="amount"
          type="number"
          min={digits === 0 ? "1" : "0.01"}
          step={
            digits === 0 ? "1" : `0.${"0".repeat(Math.max(0, digits - 1))}1`
          }
          required
          placeholder="Enter amount"
          className={input}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Expense date (optional)
        <input name="occurredAt" type="date" className={input} />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Leave blank to use the date you record this expense.
        </span>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Category
        <select name="categoryId" className={input}>
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Details (optional)
        <textarea
          name="description"
          maxLength={1000}
          rows={2}
          className={input}
        />
      </label>
      <Feedback state={state} />
      <Submit>Record expense</Submit>
    </form>
  );
}

export function StandardContributionForm({
  groupId,
  currentAmount,
  currency,
}: {
  groupId: string;
  currentAmount: string;
  currency: string;
}) {
  const digits = currencyFractionDigits(currency);
  const [state, action] = useActionState(
    updateStandardContributionAction.bind(null, groupId),
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Expected standard contribution per member
        <input
          name="amount"
          type="number"
          min="0"
          step={
            digits === 0 ? "1" : `0.${"0".repeat(Math.max(0, digits - 1))}1`
          }
          defaultValue={currentAmount}
          className={input}
        />
      </label>
      <p className="text-xs leading-5 text-slate-500">
        This is a planning reference. Actual contributions enter the official
        balance only after verification.
      </p>
      <Feedback state={state} />
      <Submit>Save amount</Submit>
    </form>
  );
}

export function ReviewSubmissionForm({
  groupId,
  submissionId,
}: {
  groupId: string;
  submissionId: string;
}) {
  const [approveState, approveAction] = useActionState(
    reviewContributionAction.bind(null, groupId, submissionId, "approve"),
    initial,
  );
  const [rejectState, rejectAction] = useActionState(
    reviewContributionAction.bind(null, groupId, submissionId, "reject"),
    initial,
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <form action={approveAction} className="space-y-2">
        <label className="block text-xs text-slate-600">
          Approval note (optional)
          <input
            name="reviewNote"
            maxLength={300}
            placeholder="Add a note"
            className={input}
          />
        </label>
        <button className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">
          Approve payment
        </button>
        <Feedback state={approveState} />
      </form>
      <form action={rejectAction} className="space-y-2">
        <label className="block text-xs text-slate-600">
          Rejection reason (optional)
          <input
            name="reviewNote"
            maxLength={300}
            placeholder="Explain why it was rejected"
            className={input}
          />
        </label>
        <button className="min-h-11 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700">
          Reject payment
        </button>
        <Feedback state={rejectState} />
      </form>
    </div>
  );
}

export function VoidTransactionForm({
  groupId,
  transactionId,
}: {
  groupId: string;
  transactionId: string;
}) {
  const [state, action] = useActionState(
    voidTransactionAction.bind(null, groupId, transactionId),
    initial,
  );
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1 text-xs text-slate-600">
        Void reason
        <input
          name="reason"
          required
          minLength={3}
          maxLength={300}
          placeholder="Reason for correction"
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
        />
      </label>
      <button className="min-h-11 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700">
        Void
      </button>
      <Feedback state={state} />
    </form>
  );
}
