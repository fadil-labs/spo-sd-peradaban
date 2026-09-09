"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SearchInput } from "@/components/operational/search-input";
import { useToast } from "@/components/ui/toast";
import { getUsersAction, resetUserPasswordAction, toggleUserStatusAction } from "./actions";
import { RefreshCw, Key, UserCheck, UserX } from "lucide-react";

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

  const pageRef = useRef(page);
  const searchRef = useRef(searchQuery);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    searchRef.current = searchQuery;
  }, [searchQuery]);

  const toast = useToast();

  const loadUsers = useCallback(async (pageNum?: number) => {
    setIsLoading(true);
    setError(null);
    const result = await getUsersAction(pageNum || pageRef.current, 20, searchRef.current || undefined);
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setUsers(result.users as User[]);
      setTotalRows(result.totalRows);
      if (pageNum) setPage(pageNum);
    }
    setIsLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleResetPassword = async (userId: string) => {
    setIsResetting(userId);
    const result = await resetUserPasswordAction(userId);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else if (result?.credentials) {
      setCredentialModal(result.credentials);
      toast.addToast("success", "Password berhasil direset.");
      loadUsers();
    }
    setIsResetting(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const result = await toggleUserStatusAction(userId, currentStatus);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", currentStatus ? "Pengguna dinonaktifkan." : "Pengguna diaktifkan.");
      loadUsers();
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
      case "admin":
        return "Admin";
      case "bendahara":
        return "Bendahara";
      case "orang_tua":
        return "Orang Tua";
      default:
        return role;
    }
  };

  const columns = [
    {
      key: "name",
      header: "Nama",
      sortable: true,
      render: (item: User) => (
        <div>
          <p className="font-medium text-foreground">{item.full_name}</p>
          {item.username && <p className="text-xs text-muted">@{item.username}</p>}
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (item: User) => {
        const isPlaceholder = item.email?.includes("@placeholder.local");
        return (
          <span className={isPlaceholder ? "text-warning" : ""}>
            {item.email || "-"}
            {isPlaceholder && <span className="ml-2 text-[10px] text-warning/80">(placeholder)</span>}
          </span>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      render: (item: User) => (
        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted">
          {getRoleLabel(item.role)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: User) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          item.is_active
            ? "border border-success/20 bg-success/10 text-success"
            : "border border-danger/20 bg-danger/10 text-danger"
        }`}>
          {item.is_active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "password",
      header: "Password",
      render: (item: User) => (
        <span className={`text-xs ${item.must_change_password ? "text-warning" : "text-muted"}`}>
          {item.must_change_password ? "Harus ganti" : "Sudah diubah"}
        </span>
      ),
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
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors active:scale-[0.98] min-h-[44px]"
          >
            {isResetting === item.id ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Key className="h-3.5 w-3.5" />
            )}
            Reset Password
          </button>
          <button
            onClick={() => handleToggleStatus(item.id, item.is_active)}
            disabled={isResetting === item.id}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors active:scale-[0.98] min-h-[44px]"
          >
            {item.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            {item.is_active ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Manajemen User"
          description="Kelola akun pengguna di sekolah"
          primaryAction={{
            label: "Refresh",
            onClick: loadUsers,
            icon: <RefreshCw className="h-4 w-4" />,
          }}
        />

        <div className="flex items-center gap-4">
          <SearchInput
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setPage(1);
            }}
            placeholder="Cari nama, email, atau username..."
          />
        </div>

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {credentialModal && (
          <Card>
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Kredensial Baru</h3>
                <p className="text-xs text-muted mt-1">Berikut adalah kredensial baru untuk pengguna. Simpan dengan aman.</p>
                <div className="mt-3 space-y-1 text-xs">
                  <p><span className="font-medium text-foreground">Email:</span> <span className="text-muted">{credentialModal.email}</span></p>
                  <p><span className="font-medium text-foreground">Password baru:</span> <span className="text-muted font-mono">{credentialModal.temporaryPassword}</span></p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
                  >
                    Salin Kredensial
                  </button>
                  <button
                    type="button"
                    onClick={() => setCredentialModal(null)}
                    className="h-9 px-3 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark active:scale-[0.98] transition-colors min-h-[44px]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <TableSkeleton rows={10} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={users}
            keyExtractor={(item) => item.id}
            emptyTitle="Belum ada pengguna"
            emptyDescription="Pengguna akan muncul setelah dibuat."
            emptyIcon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.5 4.5 0 00-7.536-7.536 9.337 9.337 0 00-.952 4.121A9.37 9.37 0 0112 3.75a9.37 9.37 0 01.75 3.128m-6.75 5.128a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm13.5 0a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            }
          />
        )}

        {totalRows > 20 && !isLoading && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">
              Menampilkan {(page - 1) * 20 + 1} - {Math.min(page * 20, totalRows)} dari {totalRows} data
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="text-xs text-muted">Halaman {page} dari {Math.max(1, Math.ceil(totalRows / 20))}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalRows / 20)}
                className="h-8 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
