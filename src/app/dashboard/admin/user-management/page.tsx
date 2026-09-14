"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Key, UserCheck, UserX, RefreshCw, X } from "lucide-react";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SearchInput } from "@/components/operational/search-input";
import { useToast } from "@/components/ui/toast";
import { getUsersAction, resetUserPasswordAction, toggleUserStatusAction } from "./actions";

type User = {
  id: string;
  full_name: string;
  email: string;
  username: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
};

type CredentialModal = {
  email: string;
  temporaryPassword: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [credentialModal, setCredentialModal] = useState<CredentialModal | null>(null);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const toast = useToast();

  const loadUsers = useCallback(async (targetPage: number, query: string, role: string) => {
    setIsLoading(true);
    setError(null);
    const result = await getUsersAction(
      targetPage,
      20,
      query.trim() || undefined,
      role !== "all" ? role : undefined
    );
    if ("error" in result && result.error) {
      setError(result.error as string);
    } else if ("users" in result) {
      setUsers(result.users as User[]);
      setTotalRows(result.totalRows || 0);
    }
    setIsLoading(false);
  }, []);

  // Otomatis memuat data setiap kali halaman, kata kunci pencarian, atau filter role berubah
  useEffect(() => {
    loadUsers(page, searchQuery, roleFilter);
  }, [page, searchQuery, roleFilter, loadUsers]);

  const handleResetPassword = async (userId: string) => {
    setIsResetting(userId);
    const result = await resetUserPasswordAction(userId);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else if (result?.credentials) {
      setCredentialModal(result.credentials);
      toast.addToast("success", "Password berhasil direset.");
      loadUsers(page, searchQuery, roleFilter);
    }
    setIsResetting(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const result = await toggleUserStatusAction(userId, currentStatus);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", currentStatus ? "Pengguna dinonaktifkan." : "Pengguna diaktifkan.");
      loadUsers(page, searchQuery, roleFilter);
    }
  };

  const copyCredentials = async () => {
    if (!credentialModal) return;
    const text = `Email: ${credentialModal.email}\nPassword: ${credentialModal.temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.addToast("success", "Kredensial berhasil disalin.");
    } catch {
      toast.addToast("error", "Gagal menyalin kredensial.");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "bendahara": return "Bendahara";
      case "orang_tua": return "Orang Tua";
      default: return role;
    }
  };

  const columns = [
    {
      key: "name",
      header: "Nama Pengguna",
      render: (item: User) => (
        <div className="space-y-0.5">
          <p className="font-bold text-[#1A1A1A]">{item.full_name}</p>
          {item.username && <p className="text-xs text-[#7A7A7A]">@{item.username}</p>}
        </div>
      ),
    },
    {
      key: "email",
      header: "Email / Akun",
      render: (item: User) => {
        const isPlaceholder = item.email?.includes("@placeholder.local");
        return (
          <span className={`text-xs font-medium ${isPlaceholder ? "text-[#C28E38]" : "text-[#1A1A1A]"}`}>
            {item.email || "-"}
            {isPlaceholder && <span className="ml-1.5 text-[10px] text-[#C28E38]/80 bg-[#C28E38]/10 px-1.5 py-0.5 rounded-md">placeholder</span>}
          </span>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      render: (item: User) => (
        <span className="inline-flex items-center rounded-full border border-[#E5E0D8] bg-[#F5F3EC] px-3 py-1 text-xs font-bold text-[#0C3B2E]">
          {getRoleLabel(item.role)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: User) => (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
          item.is_active
            ? "bg-[#0C3B2E]/10 text-[#0C3B2E]"
            : "bg-red-500/10 text-red-600"
        }`}>
          {item.is_active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "password",
      header: "Keamanan Sandi",
      render: (item: User) => (
        <span className={`text-xs font-semibold ${item.must_change_password ? "text-[#C28E38]" : "text-[#7A7A7A]"}`}>
          {item.must_change_password ? "Harus ganti" : "Sudah diubah"}
        </span>
      ),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: User) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleResetPassword(item.id)}
            disabled={isResetting === item.id}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[#E5E0D8] bg-white text-xs font-bold text-[#1A1A1A] hover:bg-[#F5F3EC] transition-all active:scale-[0.98] shadow-sm"
          >
            {isResetting === item.id ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Key className="h-3.5 w-3.5 text-[#C28E38]" />
            )}
            Reset
          </button>
          <button
            onClick={() => handleToggleStatus(item.id, item.is_active)}
            disabled={isResetting === item.id}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] shadow-sm ${
              item.is_active 
                ? "border-red-500/20 bg-red-500/5 text-red-600 hover:bg-red-500/10" 
                : "border-[#0C3B2E]/20 bg-[#0C3B2E]/5 text-[#0C3B2E] hover:bg-[#0C3B2E]/10"
            }`}
          >
            {item.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            {item.is_active ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8">
      {/* HEADER HALAMAN */}
      <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Administrasi Sistem
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Manajemen User
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] max-w-2xl leading-relaxed">
            Kelola akun pengguna di sekolah termasuk hak akses orang tua, bendahara, dan administrator dengan aman.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadUsers(page, searchQuery, roleFilter)}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0C3B2E] text-white text-xs font-bold hover:bg-[#10523E] transition-all shadow-sm active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* CREDENTIAL POPUP MODAL */}
      {credentialModal && (
        <div className="bg-white p-6 sm:p-7 rounded-[24px] border border-[#C28E38]/40 shadow-lg space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-[#C28E38]/15 text-[#C28E38]">
              <Key className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-base font-extrabold text-[#1A1A1A]">Kredensial Password Baru Berhasil Dibuat</h3>
              <p className="text-xs sm:text-sm text-[#7A7A7A]">Simpan informasi sandi sementara ini sebelum dibagikan kepada pengguna.</p>
              
              <div className="mt-4 p-4 rounded-2xl bg-[#F5F3EC] border border-[#E5E0D8] space-y-2 text-xs sm:text-sm">
                <p><span className="font-bold text-[#1A1A1A]">Email:</span> <span className="text-[#7A7A7A]">{credentialModal.email}</span></p>
                <p><span className="font-bold text-[#1A1A1A]">Password Sementara:</span> <span className="font-mono font-bold text-[#0C3B2E] bg-white px-2.5 py-1 rounded-md border border-[#E5E0D8]">{credentialModal.temporaryPassword}</span></p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0C3B2E] text-white text-xs font-bold hover:bg-[#10523E] transition-all shadow-sm"
                >
                  Salin Kredensial
                </button>
                <button
                  type="button"
                  onClick={() => setCredentialModal(null)}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[#E5E0D8] bg-white text-xs font-bold text-[#1A1A1A] hover:bg-[#F5F3EC] transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="flex-1 min-w-[240px]">
            <SearchInput
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setPage(1); // Reset ke halaman 1 saat mencari
              }}
              placeholder="Cari nama, email, atau username..."
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1); // Reset ke halaman 1 saat filter role berubah
            }}
            aria-label="Filter Berdasarkan Role"
            className="h-11 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0C3B2E] transition-all"
          >
            <option value="all">Semua Role</option>
            <option value="orang_tua">Orang Tua</option>
            <option value="bendahara">Bendahara</option>
            <option value="admin">Admin</option>
          </select>

          {(searchQuery || roleFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setRoleFilter("all"); setPage(1); }}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-[#E5E0D8] bg-white text-xs font-bold text-[#7A7A7A] hover:text-[#1A1A1A] hover:bg-[#F5F3EC] transition-all"
            >
              <X className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>

        <p className="text-xs font-semibold text-[#7A7A7A] text-right sm:text-left self-center">
          Total {totalRows} Pengguna
        </p>
      </div>

      {/* TABEL DATA UTAMA */}
      <div className="bg-white rounded-[24px] border border-[#E5E0D8] shadow-sm overflow-hidden p-2 sm:p-4">
        {isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            keyExtractor={(item) => item.id}
            emptyTitle="Belum ada pengguna"
            emptyDescription="Pengguna sistem akan muncul setelah terdaftar."
            emptyIcon={<Users className="h-6 w-6 text-[#0C3B2E]" />}
          />
        )}
      </div>

      {/* PAGINATION */}
      {totalRows > 20 && !isLoading && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-5 rounded-[24px] border border-[#E5E0D8] shadow-sm gap-4">
          <div className="text-xs font-semibold text-[#7A7A7A]">
            Menampilkan {(page - 1) * 20 + 1} - {Math.min(page * 20, totalRows)} dari {totalRows} data
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-10 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-xs font-bold text-[#7A7A7A] px-2">Halaman {page} dari {Math.max(1, Math.ceil(totalRows / 20))}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalRows / 20)}
              className="h-10 px-4 rounded-xl border border-[#E5E0D8] bg-[#F5F3EC] text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE6DC] transition-all disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}