"use server";

import { createClient } from "@/lib/supabase/server";
import { type Notification, type NotificationFilters, type NotificationType, type NotificationEntityType } from "./types";

export type { Notification, NotificationFilters, NotificationType, NotificationEntityType };

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
      (typeof value === "object" && value !== null)
    ) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function createNotification(params: {
  recipientProfileId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  schoolId: string;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  actionLabel?: string | null;
  actionHref?: string | null;
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
    return { success: false, error: "Cross-school notification not allowed" };
  }

  const { error } = await supabase.rpc("create_notification", {
    p_school_id: params.schoolId,
    p_recipient_profile_id: params.recipientProfileId,
    p_notification_type: params.notificationType,
    p_title: params.title,
    p_message: params.message,
    p_entity_type: params.entityType ?? null,
    p_entity_id: params.entityId ?? null,
    p_action_label: params.actionLabel ?? null,
    p_action_href: params.actionHref ?? null,
    p_metadata: sanitizeMetadata(params.metadata),
  });

  if (error) {
    return { success: false, error: "Gagal membuat notifikasi." };
  }

  return { success: true };
}

export async function getNotificationsAction(filters?: NotificationFilters) {
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

  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters?.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters?.notificationType && filters.notificationType !== "all") {
    query = query.eq("notification_type", filters.notificationType);
  }

  if (filters?.entityType && filters.entityType !== "all") {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters?.isRead !== undefined && filters.isRead !== "all") {
    query = query.eq("is_read", filters.isRead);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data: notifications, error: notificationsError, count } = await query;

  if (notificationsError) {
    return { error: "Gagal memuat notifikasi." };
  }

  const normalized = (notifications || []).map((n) => ({
    id: n.id,
    school_id: n.school_id,
    recipient_profile_id: n.recipient_profile_id,
    notification_type: n.notification_type,
    title: n.title,
    message: n.message,
    entity_type: n.entity_type,
    entity_id: n.entity_id,
    action_label: n.action_label,
    action_href: n.action_href,
    metadata: n.metadata,
    is_read: n.is_read,
    read_at: n.read_at,
    created_at: n.created_at,
    updated_at: n.updated_at,
  }));

  return {
    notifications: normalized,
    page,
    pageSize,
    totalRows: count || 0,
  };
}

export async function markNotificationAsReadAction(notificationId: string) {
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

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("recipient_profile_id", user.id)
    .eq("school_id", profile.school_id)
    .eq("is_read", false);

  if (error) {
    return { error: "Gagal menandai notifikasi sebagai dibaca." };
  }

  return { success: true };
}

export async function markAllNotificationsAsReadAction() {
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

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("recipient_profile_id", user.id)
    .eq("school_id", profile.school_id)
    .eq("is_read", false);

  if (error) {
    return { error: "Gagal menandai semua notifikasi sebagai dibaca." };
  }

  return { success: true };
}

export async function getUnreadNotificationCountAction() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { count: 0 };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { count: 0 };
  }

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_profile_id", user.id)
    .eq("school_id", profile.school_id)
    .eq("is_read", false);

  return { count: count || 0 };
}
