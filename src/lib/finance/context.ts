import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export type FinanceMembership = {
  role: "manager" | "assistant_manager" | "member";
  is_active: boolean;
};
export type FinanceTransaction = {
  id: string;
  type: "contribution" | "expense" | "refund";
  contribution_kind: "standard" | "additional" | null;
  member_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  amount_minor: number;
  occurred_at: string;
  status: "posted" | "voided";
};
export type FinanceSubmission = {
  id: string;
  member_id: string;
  contribution_kind: "standard" | "additional";
  amount_minor: number;
  payment_method: string;
  reference_note: string | null;
  submitted_at: string;
  status: string;
};
export async function getFinanceContext(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [
    { data: group },
    { data: membership },
    { data: settings },
    { data: categories },
    { data: transactions },
    { data: submissions },
    { data: groupMembers },
    { data: totals },
  ] = await Promise.all([
    supabase
      .from("tour_groups")
      .select("id,name,currency_code,status")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("role,is_active")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("group_finance_settings")
      .select("standard_contribution_minor")
      .eq("group_id", groupId)
      .maybeSingle(),
    supabase
      .from("expense_categories")
      .select("id,name")
      .eq("group_id", groupId)
      .order("name"),
    supabase
      .from("financial_transactions")
      .select(
        "id,type,contribution_kind,member_id,category_id,title,description,amount_minor,occurred_at,status",
      )
      .eq("group_id", groupId)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    supabase
      .from("contribution_submissions")
      .select(
        "id,member_id,contribution_kind,amount_minor,payment_method,reference_note,submitted_at,status",
      )
      .eq("group_id", groupId)
      .order("submitted_at", { ascending: false })
      .limit(50),
    supabase
      .from("group_members")
      .select("user_id,role")
      .eq("group_id", groupId)
      .eq("is_active", true)
      .order("joined_at", { ascending: true }),
    supabase.rpc("get_group_finance_totals", { p_group_id: groupId }),
  ]);
  if (!group || !(membership as FinanceMembership | null)?.is_active)
    notFound();
  const role = (membership as FinanceMembership).role;
  const canManage = role === "manager" || role === "assistant_manager";
  const isManager = role === "manager";
  const txRows = (transactions ?? []) as FinanceTransaction[];
  const submissionRows = (submissions ?? []) as FinanceSubmission[];
  const posted = txRows.filter((r) => r.status === "posted");
  const fallbackIncome = posted
    .filter((r) => r.type === "contribution")
    .reduce((s, r) => s + Number(r.amount_minor), 0);
  const fallbackExpenses = posted
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount_minor), 0);
  const fallbackRefunds = posted
    .filter((r) => r.type === "refund")
    .reduce((s, r) => s + Number(r.amount_minor), 0);
  const financeTotal = Array.isArray(totals) ? totals[0] : null;
  const totalIncome = Number(
    financeTotal?.total_contributions ?? fallbackIncome,
  );
  const totalExpenses = Number(
    financeTotal?.total_expenses ?? fallbackExpenses,
  );
  const totalRefunds = Number(financeTotal?.total_refunds ?? fallbackRefunds);
  const balance = Number(
    financeTotal?.available_balance ??
      totalIncome + totalRefunds - totalExpenses,
  );
  const activeMembers = (groupMembers ?? []) as {
    user_id: string;
    role: string;
  }[];
  const personIds = [
    ...new Set([
      ...txRows
        .map((r) => r.member_id)
        .filter((id): id is string => Boolean(id)),
      ...submissionRows.map((r) => r.member_id),
      ...activeMembers.map((m) => m.user_id),
    ]),
  ];
  const { data: people } = personIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", personIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const personMap = new Map(
    (people ?? []).map((p) => [p.id, p.full_name || "TourLedger member"]),
  );
  const members = activeMembers.map((m) => ({
    id: m.user_id,
    name: personMap.get(m.user_id) || "TourLedger member",
    role: m.role,
  }));
  return {
    user,
    group,
    role,
    canManage,
    isManager,
    members,
    currency: String(group.currency_code).trim(),
    categories: categories ?? [],
    txRows,
    submissionRows,
    pendingRows: submissionRows.filter((r) => r.status === "pending"),
    totalIncome,
    totalExpenses,
    balance,
    standardMinor: Number(settings?.standard_contribution_minor ?? 0),
    personMap,
  };
}
