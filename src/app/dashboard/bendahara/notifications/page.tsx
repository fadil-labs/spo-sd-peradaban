import { requireAuthenticatedUser, requireRole } from "@/lib/auth/authorization";
import { getNotificationsAction, type NotificationFilters } from "@/lib/notifications/service";
import NotificationsClient from "@/components/notifications/NotificationsClient";

export default async function BendaharaNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ notificationType?: string; entityType?: string; isRead?: string; startDate?: string; endDate?: string; page?: string }>;
}) {
  const profile = await requireAuthenticatedUser();
  requireRole(profile, ["bendahara"]);

  const params = await searchParams;
  const filters: NotificationFilters = {
    notificationType: (params.notificationType || "all") as NotificationFilters["notificationType"],
    entityType: (params.entityType || "all") as NotificationFilters["entityType"],
    isRead: params.isRead === "true" ? true : params.isRead === "false" ? false : "all",
    startDate: params.startDate || "",
    endDate: params.endDate || "",
    page: params.page ? Number(params.page) : 1,
    pageSize: 20,
  };

  const result = await getNotificationsAction(filters);

  if ("error" in result) {
    return (
      <div className="w-full max-w-7xl">
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <NotificationsClient initialNotifications={result.notifications} initialPage={result.page} initialPageSize={result.pageSize} initialFilters={filters} role="bendahara" />
  );
}
