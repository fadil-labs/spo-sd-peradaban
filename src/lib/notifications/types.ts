export type NotificationType =
  | "bill_created"
  | "payment_completed"
  | "payment_failed"
  | "payment_cancelled"
  | "payment_proof_submitted"
  | "payment_proof_approved"
  | "payment_proof_rejected"
  | "gateway_payment_success"
  | "guardian_welcome"
  | "general";

export type NotificationEntityType =
  | "student_bill"
  | "payment"
  | "payment_proof"
  | "payment_gateway_transaction"
  | "student"
  | "guardian"
  | "general";

export type Notification = {
  id: string;
  school_id: string;
  recipient_profile_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  entity_type: NotificationEntityType | null;
  entity_id: string | null;
  action_label: string | null;
  action_href: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationFilters = {
  notificationType?: NotificationType | "all";
  entityType?: NotificationEntityType | "all";
  isRead?: boolean | "all";
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};
