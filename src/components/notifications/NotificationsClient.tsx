"use client";

import { useState, useEffect, useCallback } from "react";
import { getNotificationsAction, markAllNotificationsAsReadAction, markNotificationAsReadAction, type NotificationFilters, type Notification } from "@/lib/notifications/service";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { DataTable } from "@/components/operational/data-table";
import { useToast } from "@/components/ui/toast";
import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type NotificationsClientProps = {
  initialNotifications: Notification[];
  initialPage: number;
  initialPageSize: number;
  initialFilters: NotificationFilters;
  role: string;
};

const NOTIFICATION_TYPE_OPTIONS = [
  { value: "all", label: "Semua Notifikasi" },
  { value: "bill_created", label: "Tagihan Baru" },
  { value: "payment_completed", label: "Pembayaran Selesai" },
  { value: "payment_failed", label: "Pembayaran Gagal" },
  { value: "payment_cancelled", label: "Pembayaran Dibatalkan" },
  { value: "payment_proof_submitted", label: "Bukti Dikirim" },
  { value: "payment_proof_approved", label: "Bukti Disetujui" },
  { value: "payment_proof_rejected", label: "Bukti Ditolak" },
  { value: "gateway_payment_success", label: "Gateway Berhasil" },
  { value: "general", label: "Umum" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "Semua Entitas" },
  { value: "student_bill", label: "Tagihan Siswa" },
  { value: "payment", label: "Pembayaran" },
  { value: "payment_proof", label: "Bukti Pembayaran" },
  { value: "payment_gateway_transaction", label: "Transaksi Gateway" },
  { value: "student", label: "Siswa" },
  { value: "general", label: "Umum" },
];

export default function NotificationsClient({ initialNotifications, initialPage, initialPageSize, initialFilters, role }: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);

  const [filters, setFilters] = useState<NotificationFilters>({
    notificationType: initialFilters.notificationType || "all",
    entityType: initialFilters.entityType || "all",
    isRead: initialFilters.isRead ?? "all",
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
    pageSize: initialPageSize,
  });

  const toast = useToast();

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getNotificationsAction({ ...filters, page });
    if ("error" in result) {
      setError(result.error ?? null);
    } else {
      setNotifications(result.notifications);
    }
    setIsLoading(false);
  }, [filters, page]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleFilterChange = (key: string, value: string | boolean | "all") => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      notificationType: "all",
      entityType: "all",
      isRead: "all",
      startDate: "",
      endDate: "",
      pageSize: initialPageSize,
    });
    setPage(1);
  };

  const handleRowClick = (item: Notification) => {
    if (item.action_href) {
      router.push(item.action_href);
    }
  };

  const hasActiveFilters = Boolean(
    filters.notificationType !== "all" ||
      filters.entityType !== "all" ||
      filters.isRead !== "all" ||
      filters.startDate ||
      filters.endDate
  );

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markNotificationAsReadAction(notificationId);
    if (!("error" in result)) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      toast.addToast("success", "Notifikasi ditandai dibaca.");
      window.dispatchEvent(new Event("notification:refresh"));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsReadAction();
    if (!("error" in result)) {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
      toast.addToast("success", "Semua notifikasi ditandai dibaca.");
      window.dispatchEvent(new Event("notification:refresh"));
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getNotificationTypeLabel = (notificationType: string) => {
    const option = NOTIFICATION_TYPE_OPTIONS.find((opt) => opt.value === notificationType);
    return option ? option.label : notificationType;
  };

  const columns = [
    {
      key: "title",
      header: "Notifikasi",
      render: (item: Notification) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            {!item.is_read && (
              <span className="inline-block h-2 w-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted mt-1">{item.message}</p>
          {item.action_href && (
            <Link
              href={item.action_href}
              className="inline-block mt-2 text-xs font-semibold text-primary hover:text-primary/80"
            >
              {item.action_label || "Lihat Detail"}
            </Link>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Jenis",
      render: (item: Notification) => getNotificationTypeLabel(item.notification_type),
      mobileHide: true,
    },
    {
      key: "date",
      header: "Tanggal",
      render: (item: Notification) => formatDate(item.created_at),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Notification) =>
        !item.is_read ? (
          <button
            onClick={() => handleMarkAsRead(item.id)}
            className="text-xs font-semibold text-primary hover:text-primary/80"
          >
            Tandai Dibaca
          </button>
        ) : (
          <span className="text-xs text-muted">Dibaca</span>
        ),
    },
  ];

  return (
    <div className="w-full max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Notifikasi</h2>
          <p className="text-sm text-muted">
            {role === "orang_tua" ? "Notifikasi tagihan dan pembayaran anak" : "Notifikasi operasional sekolah"}
          </p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
        >
          <Bell className="h-4 w-4" />
          Tandai Semua Dibaca
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4">Filter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="notificationType" className="block text-xs text-muted mb-1">Jenis Notifikasi</label>
            <select
              id="notificationType"
              value={filters.notificationType}
              onChange={(e) => handleFilterChange("notificationType", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {NOTIFICATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="entityType" className="block text-xs text-muted mb-1">Jenis Entitas</label>
            <select
              id="entityType"
              value={filters.entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notifStartDate" className="block text-xs text-muted mb-1">Tanggal Mulai</label>
            <input
              id="notifStartDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="notifEndDate" className="block text-xs text-muted mb-1">Tanggal Akhir</label>
            <input
              id="notifEndDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton items={5} />
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted">
              Menampilkan {notifications.length} dari {notifications.length} data
            </p>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    Filter aktif
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground hover:bg-muted/10 transition-colors min-h-[44px]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </>
              )}
            </div>
          </div>
          <DataTable
            columns={columns}
            data={notifications}
            keyExtractor={(item) => item.id}
            emptyTitle="Tidak ada notifikasi"
            emptyDescription="Notifikasi akan muncul ketika ada aktivitas penting."
            emptyIcon={<Bell className="h-6 w-6" />}
            onRowClick={handleRowClick}
          />
        </>
      )}
    </div>
  );
}
