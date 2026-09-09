"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getClassesAction, createClassAction, updateClassAction, exportClassesAction, importClassesAction } from "./actions";
import { Pencil, Download, Upload } from "lucide-react";

type ClassItem = {
  id: string;
  name: string;
  academic_year_id: string;
  grade_level: string | null;
};

type AcademicYear = {
  id: string;
  name: string;
};

type FormState = "list" | "create" | "edit";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    academic_year_id: "",
    grade_level: "",
  });

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ successCount: number; insertedCount: number; updatedCount: number; errorCount: number; results: { row: number; name: string; academic_year: string; status: "inserted" | "updated" | "error"; message?: string }[] } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const toast = useToast();

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getClassesAction();
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setClasses(result.classes);
      setAcademicYears(result.academicYears);
    }
    setIsLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData({ name: "", academic_year_id: "", grade_level: "" });
    setSubmitError(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("academic_year_id", formData.academic_year_id);
    formDataObj.append("grade_level", formData.grade_level);

    const result = await createClassAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Kelas berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadClasses();
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
    formDataObj.append("academic_year_id", formData.academic_year_id);
    formDataObj.append("grade_level", formData.grade_level);

    const result = await updateClassAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Kelas berhasil diperbarui.");
      resetForm();
      setFormState("list");
      setEditingId(null);
      loadClasses();
    }
    setIsSubmitting(false);
  };

  const startEdit = (cls: ClassItem) => {
    setEditingId(cls.id);
    setFormData({
      name: cls.name,
      academic_year_id: cls.academic_year_id,
      grade_level: cls.grade_level || "",
    });
    setFormState("edit");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportClassesAction();
      if ("error" in result) {
        toast.addToast("error", result.error || "Terjadi kesalahan.");
      } else if (result.success && result.data) {
        const { downloadExcel } = await import("@/lib/import-export/excel");
        downloadExcel(result.data.filename, result.data.blob);
        toast.addToast("success", "Export kelas berhasil.");
      }
    } catch {
      toast.addToast("error", "Gagal export kelas.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!importFile) {
      toast.addToast("error", "Pilih file CSV terlebih dahulu.");
      return;
    }

    setIsImporting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", importFile);
      const result = await importClassesAction(formDataObj);
      if ("error" in result) {
        toast.addToast("error", result.error || "Terjadi kesalahan.");
      } else if (result.success && result.data) {
        setImportResult(result.data);
        const { insertedCount, updatedCount, errorCount } = result.data;
        const message = `Import selesai: ${insertedCount} baru, ${updatedCount} diperbarui, ${errorCount} gagal.`;
        toast.addToast("success", message);
        loadClasses();
      }
    } catch {
      toast.addToast("error", "Gagal import kelas.");
    } finally {
      setIsImporting(false);
    }
  };

  const getAcademicYearName = (academicYearId: string) => {
    return academicYears.find((ay) => ay.id === academicYearId)?.name || "-";
  };

  const columns = [
    {
      key: "name",
      header: "Nama Kelas",
      sortable: true,
      render: (item: ClassItem) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          {item.grade_level && <p className="text-xs text-muted">{item.grade_level}</p>}
        </div>
      ),
    },
    {
      key: "academic_year",
      header: "Tahun Ajaran",
      render: (item: ClassItem) => getAcademicYearName(item.academic_year_id),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: ClassItem) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => startEdit(item)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors active:scale-[0.98] min-h-[44px]"
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
          title="Kelas"
          description="Kelola data kelas"
          primaryAction={
            formState === "list"
              ? { label: "Tambah Kelas", onClick: () => { resetForm(); setFormState("create"); } }
              : undefined
          }
          secondaryActions={
            formState === "list"
              ? [
                  { label: "Export", onClick: handleExport, icon: <Download className="h-4 w-4" />, disabled: isExporting },
                  { label: "Import", onClick: () => setShowImportDialog(true), icon: <Upload className="h-4 w-4" /> },
                ]
              : []
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

        {showImportDialog && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Import Kelas dari Excel</h3>
            <form className="space-y-4" onSubmit={handleImport}>
              <div>
                <label htmlFor="import-file" className="block text-xs text-muted mb-1.5">
                  File Excel
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImportFile(file);
                    setImportResult(null);
                  }}
                  className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isImporting}
                />
                <p className="text-xs text-muted mt-1">Format: Nama Kelas, Tahun Ajaran, Tingkatan</p>
                <a
                  href="/templates/classes-template.xlsx"
                  download
                  className="inline-flex items-center gap-2 mt-2 text-xs text-primary hover:underline"
                >
                  Download Template Excel
                </a>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isImporting || !importFile}
                  className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
                >
                  {isImporting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {isImporting ? "Mengimport..." : "Import"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }}
                  disabled={isImporting}
                  className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
                >
                  Batal
                </button>
              </div>
            </form>

            {importResult && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted">
                  Berhasil: {importResult.successCount} (Baru: {importResult.insertedCount}, Update: {importResult.updatedCount}) | Gagal: {importResult.errorCount}
                </p>
                {importResult.results.filter((result) => result.status === "error" || result.status === "updated").length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted">Row</th>
                          <th className="px-3 py-2 text-left font-medium text-muted">Nama Kelas</th>
                          <th className="px-3 py-2 text-left font-medium text-muted">Tahun Ajaran</th>
                          <th className="px-3 py-2 text-left font-medium text-muted">Status</th>
                          <th className="px-3 py-2 text-left font-medium text-muted">Pesan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.results
                          .filter((result) => result.status === "error" || result.status === "updated")
                          .map((result, index) => (
                            <tr key={index} className="border-b border-border last:border-b-0">
                              <td className="px-3 py-2 text-foreground">{result.row || "-"}</td>
                              <td className="px-3 py-2 text-foreground">{result.name}</td>
                              <td className="px-3 py-2 text-foreground">{result.academic_year}</td>
                              <td className="px-3 py-2">
                                {result.status === "updated" ? (
                                  <span className="text-yellow-700">Update</span>
                                ) : (
                                  <span className="text-danger">{result.status}</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-muted">{result.message}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {(formState === "create" || formState === "edit") && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">
              {formState === "create" ? "Tambah Kelas" : "Edit Kelas"}
            </h3>
            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div>
                 <label htmlFor="name" className="block text-xs text-muted mb-1.5">
                  Nama Kelas
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Contoh: 1A"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                 <label htmlFor="academic_year_id" className="block text-xs text-muted mb-1.5">
                  Tahun Ajaran
                </label>
                <select
                  id="academic_year_id"
                  value={formData.academic_year_id}
                  onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isSubmitting || formState === "edit"}
                >
                  <option value="">Pilih tahun ajaran</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
               </div>

               <div>
                  <label htmlFor="grade_level" className="block text-xs text-muted mb-1.5">
                   Tingkatan Kelas
                 </label>
                 <input
                   id="grade_level"
                   type="text"
                   value={formData.grade_level}
                   onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                   placeholder="Contoh: 1, 2, 3"
                   disabled={isSubmitting}
                 />
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
                data={classes}
                keyExtractor={(item) => item.id}
                emptyTitle="Belum ada kelas"
                emptyDescription="Buat kelas pertama untuk tahun ajaran aktif."
                emptyIcon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 01-.116 3.025c.007.1.022.2.042.3a60.46 60.46 0 00.362 5.114 57.84 57.84 0 013.635 4.76c.39 1.096.826 2.174 1.31 3.238M4.26 10.147a60.438 60.438 0 01-.116 3.025c.007.1.022.2.042.3a60.46 60.46 0 00.362 5.114 57.84 57.84 0 013.635 4.76c.39 1.096.826 2.174 1.31 3.238m0 0l3.388-3.388m-3.388 3.388l3.388 3.388" />
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
