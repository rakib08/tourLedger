import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Secure data endpoint for browser-side PDF generation.
 * The server authenticates, authorizes and fetches records; PDF layout/rendering
 * is intentionally performed by the manager's browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: membership } = await supabase
    .from("group_members")
    .select("role,is_active")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    !membership?.is_active ||
    !["manager", "assistant_manager"].includes(membership.role)
  ) {
    return NextResponse.json(
      { error: "Only managers and assistant managers can export reports." },
      { status: 403 },
    );
  }

  const [
    { data: group, error: groupError },
    { data: settings },
    { data: memberRows, error: membersError },
    { data: categories, error: categoriesError },
    { data: settlement },
  ] = await Promise.all([
    supabase
      .from("tour_groups")
      .select(
        "id,name,destination,start_date,end_date,currency_code,created_at,status",
      )
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_finance_settings")
      .select("standard_contribution_minor")
      .eq("group_id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id,role,is_active,joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("expense_categories")
      .select("id,name")
      .eq("group_id", groupId)
      .order("name"),
    supabase
      .from("settlements")
      .select("id,total_refund_minor,finalized_at,note")
      .eq("group_id", groupId)
      .maybeSingle(),
  ]);
  if (groupError || !group)
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  if (membersError || categoriesError)
    return NextResponse.json(
      { error: "Could not load report details." },
      { status: 500 },
    );

  const query = request.nextUrl.searchParams;
  const requestedFrom = query.get("from");
  const requestedTo = query.get("to");
  if (requestedFrom && !/^\d{4}-\d{2}-\d{2}$/.test(requestedFrom))
    return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
  if (requestedTo && !/^\d{4}-\d{2}-\d{2}$/.test(requestedTo))
    return NextResponse.json({ error: "Invalid end date." }, { status: 400 });

  // Whole Tour Timeline starts at the earliest posted financial transaction,
  // even if it was recorded before the group creation timestamp. This captures
  // legitimate pre-creation activity imported/recorded for the group.
  // If the group has no posted transactions yet, fall back to its creation date.
  const { data: firstTransaction, error: firstTransactionError } = requestedFrom
    ? { data: null, error: null }
    : await supabase
        .from("financial_transactions")
        .select("occurred_at")
        .eq("group_id", groupId)
        .eq("status", "posted")
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

  if (firstTransactionError) {
    return NextResponse.json(
      { error: "Could not determine the first transaction date." },
      { status: 500 },
    );
  }

  const firstTransactionDate = firstTransaction?.occurred_at
    ? String(firstTransaction.occurred_at).slice(0, 10)
    : String(group.created_at).slice(0, 10);

  // Whole Tour Timeline: earliest posted transaction -> date report is requested.
  // Custom date ranges still take precedence when supplied by the client.
  const from = requestedFrom || firstTransactionDate;
  const to = requestedTo || new Date().toISOString().slice(0, 10);
  if (from > to)
    return NextResponse.json(
      { error: "End date cannot be before start date." },
      { status: 400 },
    );

  // Read in bounded pages so the report is not silently truncated at 1,000 rows.
  const transactions: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    if (offset >= 50000) {
      let overflowQuery = supabase
        .from("financial_transactions")
        .select("id")
        .eq("group_id", groupId)
        .eq("status", "posted");
      if (from)
        overflowQuery = overflowQuery.gte(
          "occurred_at",
          `${from}T00:00:00.000Z`,
        );
      if (to) {
        const nextDay = new Date(`${to}T00:00:00.000Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        overflowQuery = overflowQuery.lt("occurred_at", nextDay.toISOString());
      }
      const { data: overflow, error: overflowError } =
        await overflowQuery.range(50000, 50000);
      if (overflowError)
        return NextResponse.json(
          { error: "Could not verify report size." },
          { status: 500 },
        );
      if (overflow?.length)
        return NextResponse.json(
          {
            error:
              "This report exceeds the 50,000 transaction export limit. Narrow the date range.",
          },
          { status: 413 },
        );
      break;
    }
    let txQuery = supabase
      .from("financial_transactions")
      .select(
        "id,type,contribution_kind,member_id,category_id,title,description,amount_minor,occurred_at,status,recorded_by,reversal_of",
      )
      .eq("group_id", groupId)
      .eq("status", "posted")
      .order("occurred_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (from) txQuery = txQuery.gte("occurred_at", `${from}T00:00:00.000Z`);
    if (to) {
      const nextDay = new Date(`${to}T00:00:00.000Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      txQuery = txQuery.lt("occurred_at", nextDay.toISOString());
    }
    const { data, error } = await txQuery;
    if (error)
      return NextResponse.json(
        { error: "Could not load financial transactions." },
        { status: 500 },
      );
    transactions.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const allocations = settlement
    ? await supabase
        .from("settlement_allocations")
        .select("member_id,amount_minor")
        .eq("settlement_id", settlement.id)
    : { data: [], error: null };
  if (allocations.error)
    return NextResponse.json(
      { error: "Could not load settlement allocations." },
      { status: 500 },
    );

  const ids = [
    ...new Set([
      ...(memberRows ?? []).map((row) => row.user_id),
      ...transactions
        .flatMap((row) => [row.member_id, row.recorded_by])
        .filter((id): id is string => typeof id === "string"),
      ...(allocations.data ?? []).map((row) => row.member_id),
    ]),
  ];
  const { data: profiles, error: profilesError } = ids.length
    ? await supabase.from("profiles").select("id,full_name").in("id", ids)
    : { data: [], error: null };
  if (profilesError)
    return NextResponse.json(
      { error: "Could not load member names." },
      { status: 500 },
    );

  const nameMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "TourLedger member",
    ]),
  );
  const members = (memberRows ?? []).map((row) => ({
    id: row.user_id,
    name: nameMap.get(row.user_id) || "TourLedger member",
    role: row.role,
    active: row.is_active,
    joinedAt: row.joined_at,
  }));
  const normalizedTransactions = transactions.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    contributionKind: row.contribution_kind
      ? String(row.contribution_kind)
      : null,
    memberId: row.member_id ? String(row.member_id) : null,
    memberName: row.member_id
      ? nameMap.get(String(row.member_id)) || "TourLedger member"
      : null,
    categoryId: row.category_id ? String(row.category_id) : null,
    categoryName: row.category_id
      ? (categories ?? []).find((c) => c.id === row.category_id)?.name ||
        "Uncategorized"
      : "Uncategorized",
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : "",
    amountMinor: Number(row.amount_minor),
    occurredAt: String(row.occurred_at),
    recordedBy: row.recorded_by
      ? nameMap.get(String(row.recorded_by)) || "Group member"
      : "—",
    reversalOf: row.reversal_of ? String(row.reversal_of) : null,
  }));

  return NextResponse.json(
    {
      group: {
        id: group.id,
        name: group.name,
        destination: group.destination,
        startDate: group.start_date,
        endDate: group.end_date,
        currency: String(group.currency_code).trim(),
        createdAt: group.created_at,
        status: group.status,
      },
      generatedAt: new Date().toISOString(),
      standardContributionMinor: Number(
        settings?.standard_contribution_minor ?? 0,
      ),
      members,
      categories: (categories ?? []).map((category) => ({
        id: category.id,
        name: category.name,
      })),
      transactions: normalizedTransactions,
      settlement: settlement
        ? {
            finalizedAt: settlement.finalized_at,
            totalRefundMinor: Number(settlement.total_refund_minor),
            allocations: (allocations.data ?? []).map((row) => ({
              memberId: row.member_id,
              amountMinor: Number(row.amount_minor),
            })),
          }
        : null,
      reportRange: { from, to },
      exclusions: ["Pending contribution submissions", "Voided transactions"],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
