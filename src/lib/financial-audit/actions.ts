"use server";

import { createClient } from "@/lib/supabase/server";

export type FinancialAuditActionType =
  | "payment_created"
  | "payment_completed"
  | "payment_failed"
  | "payment_cancelled"
  | "payment_refunded"
  | "payment_proof_submitted"
  | "payment_proof_approved"
  | "payment_proof_rejected"
  | "gateway_transaction_created"
  | "gateway_transaction_succeeded"
  | "gateway_transaction_failed"
  | "bill_created"
  | "bill_status_changed"
  | "payment_method_toggled"
  | "financial_config_changed"
  | "other";

export type FinancialAuditEntityType =
  | "payment"
  | "student_bill"
  | "payment_proof"
  | "payment_gateway_transaction"
  | "school_payment_method"
  | "payment_category"
  | "financial_report"
  | "other";

export type FinancialAuditLogEntry = {
  id: string;
  school_id: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  action_type: FinancialAuditActionType;
  entity_type: FinancialAuditEntityType;
  entity_id: string | null;
  payment_id: string | null;
  student_bill_id: string | null;
  old_status: string | null;
  new_status: string | null;
  amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type FinancialAuditFilters = {
  actionType?: FinancialAuditActionType | "all";
  entityType?: FinancialAuditEntityType | "all";
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
};

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata) return null;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      Array.isArray(value) ||
      (typeof value === "object" && value !== null && !Object.getPrototypeOf(value).constructor?.name?.includes("File"))
    ) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function recordFinancialAuditEvent(params: {
  actionType: FinancialAuditActionType;
  entityType: FinancialAuditEntityType;
  schoolId: string;
  actorProfileId?: string | null;
  actorRole?: string | null;
  entityId?: string | null;
  paymentId?: string | null;
  studentBillId?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  amount?: number | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Profile not found" };
  }

  if (profile.school_id !== params.schoolId) {
    return { success: false, error: "Cross-school audit not allowed" };
  }

  const { error } = await supabase.rpc("create_financial_audit_event", {
    p_action_type: params.actionType,
    p_entity_type: params.entityType,
    p_school_id: params.schoolId,
    p_entity_id: params.entityId ?? null,
    p_payment_id: params.paymentId ?? null,
    p_student_bill_id: params.studentBillId ?? null,
    p_old_status: params.oldStatus ?? null,
    p_new_status: params.newStatus ?? null,
    p_amount: params.amount ?? null,
    p_metadata: sanitizeMetadata(params.metadata),
  });

  if (error) {
    return { success: false, error: "Gagal mencatat audit." };
  }

  return { success: true };
}

export async function getFinancialAuditLogsAction(filters?: FinancialAuditFilters) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found" };
  }

  if (!["admin", "bendahara"].includes(profile.role)) {
    return { error: "Forbidden" };
  }

  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters?.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("financial_audit_logs")
    .select("*", { count: "exact" })
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters?.actionType && filters.actionType !== "all") {
    query = query.eq("action_type", filters.actionType);
  }

  if (filters?.entityType && filters.entityType !== "all") {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  if (filters?.searchQuery) {
    query = query.or(`actor_role.ilike.%${filters.searchQuery}%,entity_type.ilike.%${filters.searchQuery}%`);
  }

  const { data: logs, error: logsError, count } = await query;

  if (logsError) {
    return { error: "Gagal memuat log keuangan." };
  }

  const normalized = (logs || []).map((log) => ({
    id: log.id,
    school_id: log.school_id,
    actor_profile_id: log.actor_profile_id,
    actor_role: log.actor_role,
    action_type: log.action_type,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    payment_id: log.payment_id,
    student_bill_id: log.student_bill_id,
    old_status: log.old_status,
    new_status: log.new_status,
    amount: log.amount,
    metadata: log.metadata,
    created_at: log.created_at,
  }));

  return {
    logs: normalized,
    page,
    pageSize,
    totalRows: count || 0,
  };
}
