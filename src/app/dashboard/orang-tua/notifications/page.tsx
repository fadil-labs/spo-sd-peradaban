"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, FileText, Wallet, CheckCheck, MailOpen, X, ArrowUpRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  entity_type: string | null;
  entity_id?: string | null;
  is_read: boolean;
  created_at: string;
  user_id?: string;
};

export default function NotificationsClient({
  initialNotifications = [],
}: {
  initialNotifications?: NotificationItem[];
  initialFilters?: any;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications || []);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [entityDetails, setEntityDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const supabase = createClient();
  const toast = useToast();

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
          window.dispatchEvent(new Event("notification:refresh"));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      window.dispatchEvent(new Event("notification:refresh"));
    }
  };

  const handleOpenDetail = async (notif: NotificationItem) => {
    setSelectedNotification(notif);
    setEntityDetails(null);

    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }

    setIsLoadingDetails(true);
    try {
      let foundData = null;

      // 1. Coba ambil berdasarkan entity_id jika tersedia
      if (notif.entity_id) {
        if (notif.notification_type === "payment" || notif.entity_type === "payment" || notif.title.toLowerCase().includes("pembayaran")) {
          const { data } = await supabase
            .from("payments")
            .select(`
              id, amount, payment_date, reference_number, status,
              students (nis, full_name),
              payment_methods (name),
              student_bills (amount, payment_categories (name))
            `)
            .eq("id", notif.entity_id)
            .maybeSingle();
          foundData = data;
        } else if (notif.notification_type === "bill" || notif.notification_type === "billing" || notif.entity_type === "bill" || notif.title.toLowerCase().includes("tagihan")) {
          const { data } = await supabase
            .from("student_bills")
            .select(`
              id, amount, status, due_date, billing_period_start, billing_period_end,
              students (nis, full_name),
              payment_categories (name)
            `)
            .eq("id", notif.entity_id)
            .maybeSingle();
          foundData = data;
        }
      }

      // 2. Fallback Pintar: Jika entity_id kosong, ambil data transaksi/tagihan terbaru yang relevan
      if (!foundData) {
        const titleLower = notif.title.toLowerCase();
        if (titleLower.includes("pembayaran") || notif.notification_type === "payment") {
          const { data } = await supabase
            .from("payments")
            .select(`
              id, amount, payment_date, reference_number, status,
              students (nis, full_name),
              payment_methods (name),
              student_bills (amount, payment_categories (name))
            `)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          foundData = data;
        } else if (titleLower.includes("tagihan") || notif.notification_type === "bill" || notif.notification_type === "billing") {
          const { data } = await supabase
            .from("student_bills")
            .select(`
              id, amount, status, due_date, billing_period_start, billing_period_end,
              students (nis, full_name),
              payment_categories (name)
            `)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          foundData = data;
        }
      }

      if (foundData) {
        setEntityDetails(foundData);
      }
    } catch (err) {
      console.error("Gagal memuat detail entitas:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.addToast("success", "Semua notifikasi ditandai sudah dibaca.");
      window.dispatchEvent(new Event("notification:refresh"));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "bill":
      case "billing": return <Wallet className="h-5 w-5 text-[#0C3B2E]" />;
      case "payment": return <FileText className="h-5 w-5 text-[#0C3B2E]" />;
      default: return <Bell className="h-5 w-5 text-[#C28E38]" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "bill":
      case "billing": return "Tagihan Sekolah";
      case "payment": return "Konfirmasi Pembayaran";
      case "announcement": return "Pengumuman Sekolah";
      default: return "Informasi Umum";
    }
  };

  // Helper untuk menentukan URL tujuan tombol "Buka Rincian Terkait" secara cerdas
  const getTargetUrl = () => {
    const isPayment = 
      selectedNotification?.notification_type === "payment" || 
      selectedNotification?.title?.toLowerCase().includes("pembayaran") ||
      entityDetails?.payment_methods !== undefined ||
      entityDetails?.reference_number !== undefined;

    const targetId = selectedNotification?.entity_id || entityDetails?.id;
    if (!targetId) return null;

    if (isPayment) {
      return `/dashboard/orang-tua/payments/receipt/${targetId}`;
    } else {
      return `/dashboard/orang-tua/bills/${targetId}`;
    }
  };

  const targetUrl = getTargetUrl();

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8">
      {/* HEADER HALAMAN */}
      <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Pusat Informasi
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Pusat Notifikasi
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] max-w-2xl leading-relaxed">
            Pantau informasi terbaru seputar tagihan, konfirmasi pembayaran, dan pengumuman penting sekolah secara real-time. Klik pada pesan untuk melihat rincian detail transaksi.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0C3B2E] text-white text-xs font-extrabold hover:bg-[#10523E] transition-all shadow-sm active:scale-[0.98]"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}

          <div className="flex items-center gap-3 bg-[#F5F3EC] p-4 rounded-2xl border border-[#E5E0D8] shrink-0">
            <div className="h-11 w-11 rounded-xl bg-[#0C3B2E] text-white flex items-center justify-center font-bold shadow-sm relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-[11px] text-[#7A7A7A] font-semibold uppercase tracking-wider">Belum Dibaca</p>
              <p className="text-base font-black text-[#1A1A1A] mt-0.5">
                {unreadCount} Pesan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DAFTAR NOTIFIKASI */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-[#E5E0D8] p-12 text-center space-y-3 shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-[#0C3B2E]/10 text-[#0C3B2E] flex items-center justify-center mx-auto">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A]">Belum Ada Notifikasi</h3>
            <p className="text-xs sm:text-sm text-[#7A7A7A]">Pemberitahuan baru akan muncul secara otomatis di sini.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleOpenDetail(notif)}
              className={`p-6 rounded-[24px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm cursor-pointer hover:border-[#0C3B2E]/50 ${
                notif.is_read
                  ? "bg-white border-[#E5E0D8]"
                  : "bg-[#F5F3EC] border-[#0C3B2E]/30 ring-1 ring-[#0C3B2E]/10"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-white border border-[#E5E0D8] shrink-0 shadow-xs">
                  {getNotificationIcon(notif.notification_type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-extrabold text-[#1A1A1A]">{notif.title}</h4>
                    {!notif.is_read && (
                      <span className="inline-flex rounded-full bg-[#0C3B2E] px-2.5 py-0.5 text-[10px] font-bold text-white">
                        Baru
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#555] line-clamp-1 leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] font-semibold text-[#7A7A7A] pt-1">{formatDate(notif.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className="text-xs font-bold text-[#0C3B2E] hover:underline inline-flex items-center gap-1">
                  <span>Lihat Rincian</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL POPUP DETAIL PESAN DENGAN RINCIAN */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-[28px] border border-[#E5E0D8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 sm:p-7 border-b border-[#E5E0D8] flex items-center justify-between bg-[#F5F3EC]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white border border-[#E5E0D8] shadow-xs">
                  {getNotificationIcon(selectedNotification.notification_type)}
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#0C3B2E]/10 text-[#0C3B2E] uppercase tracking-wider">
                    {getNotificationTypeLabel(selectedNotification.notification_type)}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#1A1A1A] mt-0.5">{selectedNotification.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="h-10 w-10 rounded-xl bg-white border border-[#E5E0D8] flex items-center justify-center text-[#7A7A7A] hover:text-[#1A1A1A] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              {/* Pesan Utama */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Pesan Sistem</p>
                <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] text-sm text-[#333] leading-relaxed">
                  {selectedNotification.message}
                </div>
              </div>

              {/* Detail Dinamis (Rincian Transaksi/Tagihan) */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Rincian Terkait</p>
                
                {isLoadingDetails ? (
                  <div className="p-6 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] flex items-center justify-center gap-3 text-xs font-bold text-[#7A7A7A]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0C3B2E]" />
                    Memuat rincian data...
                  </div>
                ) : entityDetails ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8]">
                    {entityDetails.payment_methods !== undefined || entityDetails.reference_number !== undefined ? (
                      <>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Nama Siswa (Anak)</p>
                          <p className="text-sm font-extrabold text-[#1A1A1A]">{entityDetails.students?.full_name || "-"}</p>
                          <p className="text-xs text-[#7A7A7A]">NIS: {entityDetails.students?.nis || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Jumlah Pembayaran</p>
                          <p className="text-sm font-black text-[#0C3B2E]">{formatCurrency(entityDetails.amount)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Metode Pembayaran</p>
                          <p className="text-sm font-bold text-[#1A1A1A]">{entityDetails.payment_methods?.name || "Manual"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Nomor Referensi / Order ID</p>
                          <p className="text-xs font-mono font-bold text-[#1A1A1A]">{entityDetails.reference_number || "-"}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Nama Siswa (Anak)</p>
                          <p className="text-sm font-extrabold text-[#1A1A1A]">{entityDetails.students?.full_name || "-"}</p>
                          <p className="text-xs text-[#7A7A7A]">NIS: {entityDetails.students?.nis || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Kategori Tagihan</p>
                          <p className="text-sm font-bold text-[#1A1A1A]">{entityDetails.payment_categories?.name || "-"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Total Nominal</p>
                          <p className="text-sm font-black text-[#C28E38]">{formatCurrency(entityDetails.amount)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-[#7A7A7A]">Tanggal Jatuh Tempo</p>
                          <p className="text-sm font-bold text-[#1A1A1A]">
                            {entityDetails.due_date ? new Date(entityDetails.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] text-xs text-[#7A7A7A]">
                    Informasi rincian tambahan tidak tersedia untuk pesan ini.
                  </div>
                )}
              </div>

              {/* Waktu Diterima */}
              <div className="space-y-1 pt-1">
                <p className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Waktu Diterima</p>
                <p className="text-xs font-semibold text-[#555]">{formatDate(selectedNotification.created_at)}</p>
              </div>

              {/* Tombol Aksi Cepat dengan Routing Pintar */}
              {targetUrl && (
                <div className="pt-2">
                  <Link
                    href={targetUrl}
                    onClick={() => setSelectedNotification(null)}
                    className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#0C3B2E] text-white text-sm font-extrabold hover:bg-[#10523E] transition-all shadow-sm"
                  >
                    <span>Buka Rincian Terkait</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-[#E5E0D8] bg-[#F5F3EC] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="h-11 px-6 rounded-xl bg-white border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}