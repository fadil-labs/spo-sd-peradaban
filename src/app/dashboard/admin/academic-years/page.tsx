"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/operational/StatusBadge";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getAcademicYearsAction, createAcademicYearAction, updateAcademicYearAction, activateAcademicYearAction, deactivateAcademicYearAction } from "./actions";
import { Pencil, Power, PowerOff } from "lucide-react";

type AcademicYear = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type FormState = "list" | "create" | "edit";

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  const toast = useToast();

  const loadAcademicYears = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getAcademicYearsAction();
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setAcademicYears(result.academicYears);
    }
    setIsLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData({ name: "", start_date: "", end_date: "" });
    setSubmitError(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("start_date", formData.start_date);
    formDataObj.append("end_date", formData.end_date);

    const result = await createAcademicYearAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Tahun ajaran berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadAcademicYears();
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
    formDataObj.append("name", formData.name);
    formDataObj.append("start_date", formData.start_date);
    formDataObj.append("end_date", formData.end_date);

    const result = await updateAcademicYearAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Tahun ajaran berhasil diperbarui.");
      resetForm();
      setFormState("list");
      setEditingId(null);
      loadAcademicYears();
    }
    setIsSubmitting(false);
  };

  const handleActivate = async (id: string) => {
    const result = await activateAcademicYearAction(id);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Tahun ajaran diaktifkan.");
      loadAcademicYears();
    }
  };

  const handleDeactivate = async (id: string) => {
    const result = await deactivateAcademicYearAction(id);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Tahun ajaran dinonaktifkan.");
      loadAcademicYears();
    }
  };

  const startEdit = (year: AcademicYear) => {
    setEditingId(year.id);
    setFormData({
      name: year.name,
      start_date: year.start_date,
      end_date: year.end_date,
    });
    setFormState("edit");
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const columns = [
    {
      key: "name",
      header: "Tahun Ajaran",
      sortable: true,
      render: (item: AcademicYear) => (
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{item.name}</p>
          {item.is_active && <StatusBadge status="active" />}
        </div>
      ),
    },
    {
      key: "period",
      header: "Periode",
      render: (item: AcademicYear) => (
        <span className="text-muted">
          {formatDate(item.start_date)} — {formatDate(item.end_date)}
        </span>
      ),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: AcademicYear) => (
        <div className="flex items-center justify-end gap-2">
          {!item.is_active ? (
            <button
              onClick={() => handleActivate(item.id)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-success text-white text-xs font-semibold hover:bg-success/90 transition-colors min-h-[44px]"
            >
              <Power className="h-3.5 w-3.5" />
              Aktifkan
            </button>
          ) : (
            <button
              onClick={() => handleDeactivate(item.id)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-warning text-warning text-xs font-semibold hover:bg-warning/10 transition-all active:scale-[0.98] min-h-[44px]"
            >
              <PowerOff className="h-3.5 w-3.5" />
              Nonaktifkan
            </button>
          )}
          <button
            onClick={() => startEdit(item)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Tahun Ajaran"
          description="Kelola tahun ajaran sekolah"
          primaryAction={
            formState === "list"
              ? { label: "Tambah Tahun Ajaran", onClick: () => { resetForm(); setFormState("create"); } }
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
              {formState === "create" ? "Tambah Tahun Ajaran" : "Edit Tahun Ajaran"}
            </h3>
            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div>
                   <label htmlFor="name" className="block text-xs text-muted mb-1.5">
                  Nama Tahun Ajaran
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="2024/2025"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="start_date" className="block text-xs text-muted mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                   <label htmlFor="end_date" className="block text-xs text-muted mb-1.5">
                    Tanggal Selesai
                  </label>
                  <input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  />
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
            {isLoading ? (
              <TableSkeleton rows={5} columns={3} />
            ) : (
              <DataTable
                columns={columns}
                data={academicYears}
                keyExtractor={(item) => item.id}
                emptyTitle="Belum ada tahun ajaran"
                emptyDescription="Buat tahun ajaran pertama untuk sekolah."
                emptyIcon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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
