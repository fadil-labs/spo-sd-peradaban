"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/operational/search-input";
import { StatusBadge } from "@/components/operational/StatusBadge";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getStudentsAction, createStudentAction, updateStudentAction, exportStudentsAction, importStudentsAction } from "./actions";
import { createEnrollmentAction } from "../enrollments/actions";
import { bulkLinkGuardianToStudentsAction, getGuardianSearchAction } from "../guardians/actions";
import { Pencil, X, Download, Upload, CheckSquare, Square, UserSearch } from "lucide-react";

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
  const router = useRouter();
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

  const pageRef = useRef(page);
  const searchRef = useRef(searchQuery);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    searchRef.current = searchQuery;
  }, [searchQuery]);

  const [formData, setFormData] = useState({
    nis: "",
    full_name: "",
    birth_date: "",
    address: "",
    status: "active",
  });

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ successCount: number; insertedCount: number; updatedCount: number; errorCount: number; results: { row: number; nis: string; full_name: string; status: "inserted" | "updated" | "error"; message?: string }[] } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importAcademicYearId, setImportAcademicYearId] = useState("");

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkEnrollAcademicYearId, setBulkEnrollAcademicYearId] = useState("");
  const [bulkEnrollClassId, setBulkEnrollClassId] = useState("");
  const [isBulkEnrolling, setIsBulkEnrolling] = useState(false);
  const [showBulkEnrollForm, setShowBulkEnrollForm] = useState(false);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  const [showBulkGuardianForm, setShowBulkGuardianForm] = useState(false);
  const [guardianSearchQuery, setGuardianSearchQuery] = useState("");
  const [guardianSearchResults, setGuardianSearchResults] = useState<{ guardian_profile_id: string; full_name: string; email: string; phone: string }[]>([]);
  const [selectedGuardianProfileId, setSelectedGuardianProfileId] = useState("");
  const [isLinkingGuardian, setIsLinkingGuardian] = useState(false);

  const toast = useToast();

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getStudentsAction(searchRef.current || undefined, statusFilter, pageRef.current, pageSize);
    if ("error" in result) {
      setError(result.error || null);
    } else {
      setStudents(result.students);
      setTotalRows(result.totalRows);
    }
    setIsLoading(false);
  }, [statusFilter, pageSize]);

  const loadBulkEnrollLookups = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    const [{ data: yearsData }, { data: classesData }] = await Promise.all([
      supabase.from("academic_years").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: false }),
      supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name"),
    ]);

    setAcademicYears(yearsData || []);
    setClasses(classesData || []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (showBulkEnrollForm) {
      loadBulkEnrollLookups();
    }
  }, [showBulkEnrollForm, loadBulkEnrollLookups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (showImportDialog) {
      loadBulkEnrollLookups();
      setImportAcademicYearId("");
    }
  }, [showImportDialog, loadBulkEnrollLookups]);
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

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const handleBulkEnroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedStudentIds.size === 0 || !bulkEnrollAcademicYearId) {
      toast.addToast("error", "Pilih siswa dan tahun ajaran terlebih dahulu.");
      return;
    }

    setIsBulkEnrolling(true);
    let successCount = 0;
    let errorCount = 0;

    for (const studentId of selectedStudentIds) {
      const formDataObj = new FormData();
      formDataObj.append("student_id", studentId);
      formDataObj.append("academic_year_id", bulkEnrollAcademicYearId);
      if (bulkEnrollClassId) {
        formDataObj.append("class_id", bulkEnrollClassId);
      }

      const result = await createEnrollmentAction(formDataObj);
      if ("error" in result) {
        errorCount += 1;
      } else {
        successCount += 1;
      }
    }

    setIsBulkEnrolling(false);
    setSelectedStudentIds(new Set());
    setBulkEnrollAcademicYearId("");
    setBulkEnrollClassId("");
    setShowBulkEnrollForm(false);

    if (errorCount === 0) {
      toast.addToast("success", `Berhasil mendaftarkan ${successCount} siswa.`);
    } else {
      toast.addToast("error", `Selesai: ${successCount} berhasil, ${errorCount} gagal.`);
    }

    loadStudents();
  };

  const handleGuardianSearch = useCallback(async (query: string) => {
    setGuardianSearchQuery(query);
    if (query.trim().length === 0) {
      setGuardianSearchResults([]);
      return;
    }
    const result = await getGuardianSearchAction(query.trim());
    if ("error" in result) {
      toast.addToast("error", result.error as string);
      setGuardianSearchResults([]);
    } else {
      setGuardianSearchResults(result.guardians as { guardian_profile_id: string; full_name: string; email: string; phone: string }[]);
    }
  }, [toast]);

  const handleBulkLinkGuardian = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedGuardianProfileId || selectedStudentIds.size === 0) {
      toast.addToast("error", "Pilih wali dan minimal satu siswa.");
      return;
    }

    setIsLinkingGuardian(true);
    const formDataObj = new FormData();
    formDataObj.append("guardian_profile_id", selectedGuardianProfileId);
    selectedStudentIds.forEach((id) => formDataObj.append("student_ids", id));

    const result = await bulkLinkGuardianToStudentsAction(formDataObj);
    if ("error" in result) {
      toast.addToast("error", result.error as string);
    } else {
      toast.addToast("success", `Berhasil menghubungkan ${result.linkedCount} siswa ke wali.`);
      setSelectedStudentIds(new Set());
      setSelectedGuardianProfileId("");
      setShowBulkGuardianForm(false);
      setGuardianSearchResults([]);
      setGuardianSearchQuery("");
      loadStudents();
    }
    setIsLinkingGuardian(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("nis", formData.nis);
    formDataObj.append("name", formData.full_name);
    formDataObj.append("birth_date", formData.birth_date);
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
    formDataObj.append("birth_date", formData.birth_date);
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportStudentsAction();
      if ("error" in result) {
        toast.addToast("error", result.error || "Terjadi kesalahan.");
      } else if (result.success && result.data) {
        const { downloadExcel } = await import("@/lib/import-export/excel");
        downloadExcel(result.data.filename, result.data.blob);
        toast.addToast("success", "Export siswa berhasil.");
      }
    } catch {
      toast.addToast("error", "Gagal export siswa.");
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
      if (importAcademicYearId) {
        formDataObj.append("academic_year_id", importAcademicYearId);
      }
      const result = await importStudentsAction(formDataObj);
      if ("error" in result) {
        toast.addToast("error", result.error || "Terjadi kesalahan.");
      } else if (result.success && result.data) {
        setImportResult(result.data);
        const { insertedCount, updatedCount, errorCount } = result.data;
        const message = `Import selesai: ${insertedCount} baru, ${updatedCount} diperbarui, ${errorCount} gagal.`;
        toast.addToast("success", message);
        loadStudents();
      }
    } catch {
      toast.addToast("error", "Gagal import siswa.");
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const columns = [
    {
      key: "select",
      header: (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelectAll();
          }}
          className="inline-flex items-center justify-center"
        >
          {students.length > 0 && selectedStudentIds.size === students.length ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted" />
          )}
        </button>
      ),
      render: (item: Student) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleStudentSelection(item.id);
          }}
          className="inline-flex items-center justify-center"
        >
          {selectedStudentIds.has(item.id) ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted" />
          )}
        </button>
      ),
      className: "w-12 text-center",
      mobileHide: true,
    },
    { key: "nis", header: "NIS", sortable: true },
    { key: "full_name", header: "Nama", sortable: true },
    { key: "birth_date", header: "Tanggal Lahir", render: (item: Student) => formatDate(item.birth_date), mobileHide: true },
    { key: "status", header: "Status", render: (item: Student) => <StatusBadge status={item.status} /> },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Student) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => router.push(`/dashboard/admin/students/${item.id}`)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
          >
            Detail
          </button>
          <button
            onClick={() => startEdit(item)}
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
          title="Siswa"
          description="Kelola data siswa"
          primaryAction={
            formState === "list"
              ? { label: "Tambah Siswa", onClick: () => setFormState("create") }
              : undefined
          }
          secondaryActions={
            formState === "list"
              ? [
                  { label: "Export", onClick: handleExport, icon: <Download className="h-4 w-4" />, disabled: isExporting },
                  { label: "Import", onClick: () => setShowImportDialog(true), icon: <Upload className="h-4 w-4" /> },
                  {
                    label: "Enroll Bulk",
                    onClick: () => {
                      if (selectedStudentIds.size === 0) {
                        toast.addToast("error", "Pilih minimal satu siswa terlebih dahulu.");
                        return;
                      }
                      setShowBulkEnrollForm(true);
                    },
                    icon: <CheckSquare className="h-4 w-4" />,
                    disabled: selectedStudentIds.size === 0,
                  },
                  {
                    label: "Link Guardian",
                    onClick: () => {
                      if (selectedStudentIds.size === 0) {
                        toast.addToast("error", "Pilih minimal satu siswa terlebih dahulu.");
                        return;
                      }
                      setShowBulkGuardianForm(true);
                    },
                    icon: <UserSearch className="h-4 w-4" />,
                    disabled: selectedStudentIds.size === 0,
                  },
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
            <h3 className="text-base font-semibold text-foreground mb-4">Import Siswa dari Excel</h3>
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
                <p className="text-xs text-muted mt-1">Mendukung format sederhana maupun Dapodik. Untuk format Dapodik, data orang tua akan otomatis dihubungkan.</p>
                <div className="inline-flex items-center gap-3 mt-2">
                  <a
                    href="/templates/students-template.xlsx"
                    download
                    className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    Download Template Sederhana
                  </a>
                  <span className="text-xs text-muted">|</span>
                  <a
                    href="/templates/template_database_dapodik.xlsx"
                    download
                    className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    Download Template Dapodik
                  </a>
                </div>
              </div>

              <div>
                <label htmlFor="import-academic-year" className="block text-xs text-muted mb-1.5">
                  Tahun Ajaran <span className="text-muted">(Untuk enrollment & kelas dari format Dapodik)</span>
                </label>
                <select
                  id="import-academic-year"
                  value={importAcademicYearId}
                  onChange={(e) => setImportAcademicYearId(e.target.value)}
                  className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isImporting}
                >
                  <option value="">Pilih Tahun Ajaran</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>{year.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1">Wajib diisi jika menggunakan format Dapodik agar kelas dan enrollment otomatis dibuat.</p>
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
                  onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); setImportAcademicYearId(""); }}
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
                          <th className="px-3 py-2 text-left font-medium text-muted">NIS</th>
                          <th className="px-3 py-2 text-left font-medium text-muted">Nama</th>
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
                              <td className="px-3 py-2 text-foreground">{result.nis}</td>
                              <td className="px-3 py-2 text-foreground">{result.full_name}</td>
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

        {showBulkEnrollForm && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Enroll Bulk Siswa</h3>
            <p className="text-xs text-muted mb-4">
              {selectedStudentIds.size} siswa dipilih. Pilih tahun ajaran, dan opsional kelas untuk mendaftarkan siswa tersebut.
            </p>
            <form className="space-y-4" onSubmit={handleBulkEnroll}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bulk-academic-year" className="block text-xs text-muted mb-1.5">
                    Tahun Ajaran
                  </label>
                  <select
                    id="bulk-academic-year"
                    value={bulkEnrollAcademicYearId}
                    onChange={(e) => setBulkEnrollAcademicYearId(e.target.value)}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isBulkEnrolling}
                  >
                    <option value="">Pilih Tahun Ajaran</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>{year.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="bulk-class" className="block text-xs text-muted mb-1.5">
                    Kelas <span className="text-muted">(Opsional)</span>
                  </label>
                  <select
                    id="bulk-class"
                    value={bulkEnrollClassId}
                    onChange={(e) => setBulkEnrollClassId(e.target.value)}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isBulkEnrolling}
                  >
                    <option value="">Tanpa Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isBulkEnrolling || selectedStudentIds.size === 0}
                  className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
                >
                  {isBulkEnrolling && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {isBulkEnrolling ? "Mendaftarkan..." : `Daftarkan ${selectedStudentIds.size} Siswa`}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBulkEnrollForm(false); setSelectedStudentIds(new Set()); }}
                  disabled={isBulkEnrolling}
                  className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
                >
                  Batal
                </button>
              </div>
            </form>
          </Card>
        )}

        {showBulkGuardianForm && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Hubungkan Wali ke Siswa</h3>
            <p className="text-xs text-muted mb-4">
              {selectedStudentIds.size} siswa dipilih. Cari dan pilih wali yang akan dihubungkan ke siswa tersebut.
            </p>
            <form className="space-y-4" onSubmit={handleBulkLinkGuardian}>
              <div>
                <label htmlFor="guardian-search" className="block text-xs text-muted mb-1.5">
                  Cari Wali (Nama, Email, No HP)
                </label>
                <input
                  id="guardian-search"
                  type="text"
                  value={guardianSearchQuery}
                  onChange={(e) => handleGuardianSearch(e.target.value)}
                  placeholder="Ketik untuk mencari wali..."
                  className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isLinkingGuardian}
                />
                {guardianSearchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-background">
                    {guardianSearchResults.map((guardian) => (
                      <button
                        key={guardian.guardian_profile_id}
                        type="button"
                        onClick={() => {
                          setSelectedGuardianProfileId(guardian.guardian_profile_id);
                          setGuardianSearchQuery(`${guardian.full_name} (${guardian.email})`);
                          setGuardianSearchResults([]);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-muted/10 transition-colors border-b border-border last:border-b-0 ${selectedGuardianProfileId === guardian.guardian_profile_id ? "bg-primary/10" : ""}`}
                      >
                        <p className="text-sm font-medium text-foreground">{guardian.full_name}</p>
                        <p className="text-xs text-muted">{guardian.email} {guardian.phone ? `• ${guardian.phone}` : ""}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedGuardianProfileId && (
                  <p className="text-xs text-green-600 mt-1">Wali dipilih. Klik submit untuk menghubungkan.</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isLinkingGuardian || !selectedGuardianProfileId || selectedStudentIds.size === 0}
                  className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
                >
                  {isLinkingGuardian && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {isLinkingGuardian ? "Menghubungkan..." : `Hubungkan ${selectedStudentIds.size} Siswa ke Wali`}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowBulkGuardianForm(false); setSelectedStudentIds(new Set()); setSelectedGuardianProfileId(""); setGuardianSearchResults([]); setGuardianSearchQuery(""); }}
                  disabled={isLinkingGuardian}
                  className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
                >
                  Batal
                </button>
              </div>
            </form>
          </Card>
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
