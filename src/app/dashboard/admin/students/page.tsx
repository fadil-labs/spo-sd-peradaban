"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/operational/search-input";
import { StatusBadge } from "@/components/operational/StatusBadge";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getStudentsAction, createStudentAction, updateStudentAction } from "./actions";
import { Pencil, X } from "lucide-react";

type Student = {
  id: string;
  nis: string;
  full_name: string;
  birth_date: string | null;
  address: string | null;
  status: string;
};

type FormState = "list" | "create" | "edit";

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Tidak Aktif" },
  { value: "graduated", label: "Lulus" },
  { value: "transferred", label: "Pindah" },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalRows, setTotalRows] = useState(0);

  const [formData, setFormData] = useState({
    nis: "",
    full_name: "",
    birth_date: "",
    address: "",
    status: "active",
  });

  const toast = useToast();

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getStudentsAction(searchQuery || undefined, statusFilter, page, pageSize);
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setStudents(result.students);
      setTotalRows(result.totalRows);
    }
    setIsLoading(false);
  }, [searchQuery, statusFilter, page, pageSize]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadStudents();
  }, [searchQuery, statusFilter, loadStudents]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData({
      nis: "",
      full_name: "",
      birth_date: "",
      address: "",
      status: "active",
    });
    setSubmitError(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("nis", formData.nis);
    formDataObj.append("name", formData.full_name);
    formDataObj.append("address", formData.address);
    formDataObj.append("status", formData.status);

    const result = await createStudentAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Siswa berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadStudents();
    }
    setIsSubmitting(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("id", editingId);
    formDataObj.append("nis", formData.nis);
    formDataObj.append("name", formData.full_name);
    formDataObj.append("address", formData.address);
    formDataObj.append("status", formData.status);

    const result = await updateStudentAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Siswa berhasil diperbarui.");
      resetForm();
      setFormState("list");
      setEditingId(null);
      loadStudents();
    }
    setIsSubmitting(false);
  };

  const startEdit = (student: Student) => {
    setEditingId(student.id);
    setFormData({
      nis: student.nis,
      full_name: student.full_name,
      birth_date: student.birth_date || "",
      address: student.address || "",
      status: student.status,
    });
    setFormState("edit");
  };

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const columns = [
    { key: "nis", header: "NIS", sortable: true },
    { key: "full_name", header: "Nama", sortable: true },
    { key: "birth_date", header: "Tanggal Lahir", render: (item: Student) => formatDate(item.birth_date), mobileHide: true },
    { key: "status", header: "Status", render: (item: Student) => <StatusBadge status={item.status} /> },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Student) => (
        <button
          onClick={() => startEdit(item)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Siswa"
          description="Kelola data siswa"
          primaryAction={
            formState === "list"
              ? { label: "Tambah Siswa", onClick: () => setFormState("create") }
              : undefined
          }
        />

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {submitError && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{submitError}</p>
          </div>
        )}

        {(formState === "create" || formState === "edit") && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">
              {formState === "create" ? "Tambah Siswa" : "Edit Siswa"}
            </h3>
            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="nis" className="block text-xs text-muted mb-1.5">
                    NIS
                  </label>
                  <input
                    id="nis"
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                     className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                   <label htmlFor="full_name" className="block text-xs text-muted mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                     className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="birth_date" className="block text-xs text-muted mb-1.5">
                    Tanggal Lahir
                  </label>
                  <input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                   <label htmlFor="status" className="block text-xs text-muted mb-1.5">
                    Status
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                    className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
                >
                  {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setFormState("list"); setEditingId(null); }}
                  disabled={isSubmitting}
                   className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
                >
                  Batal
                </button>
              </div>
            </form>
          </Card>
        )}

        {formState === "list" && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3 flex-wrap">
                <SearchInput
                  value={searchQuery}
                  onChange={(value) => { setSearchQuery(value); setPage(1); }}
                  placeholder="Cari NIS atau nama siswa..."
                />
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                   className="sm:h-10 h-11 w-40 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Semua Status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {(searchQuery || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setStatusFilter("all"); setPage(1); }}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border bg-surface text-xs font-medium text-muted hover:text-foreground hover:bg-muted/10 transition-colors min-h-[44px]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  Sebelumnya
                </button>
                <span className="text-xs text-muted">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  Selanjutnya
                </button>
              </div>
            </div>

            <p className="text-xs text-muted">
              Menampilkan {students.length} dari {totalRows} data
            </p>

            {isLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : (
              <DataTable
                columns={columns}
                data={students}
                keyExtractor={(item) => item.id}
                emptyTitle="Belum ada siswa"
                emptyDescription="Mulai dengan menambahkan siswa pertama ke sistem."
                emptyIcon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.5 4.5 0 00-7.536-7.536 9.337 9.337 0 00-.952 4.121A9.37 9.37 0 0112 3.75a9.37 9.37 0 01.75 3.128m-6.75 5.128a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm13.5 0a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                }
              />
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
