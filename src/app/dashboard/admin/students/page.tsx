"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import {
  getStudentsAction,
  createStudentAction,
  updateStudentAction,
  exportStudentsAction,
  importStudentsAction,
} from "./actions";
import { createEnrollmentAction } from "../enrollments/actions";
import { bulkLinkGuardianToStudentsAction, getGuardianSearchAction } from "../guardians/actions";
import {
  Pencil,
  X,
  Download,
  Upload,
  CheckSquare,
  Square,
  UserSearch,
  UserPlus,
  Search,
  Users,
  GraduationCap,
} from "lucide-react";

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
  const [importResult, setImportResult] = useState<{
    successCount: number;
    insertedCount: number;
    updatedCount: number;
    errorCount: number;
    results: {
      row: number;
      nis: string;
      full_name: string;
      status: "inserted" | "updated" | "error";
      message?: string;
    }[];
  } | null>(null);
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
  const [guardianSearchResults, setGuardianSearchResults] = useState<
    { guardian_profile_id: string; full_name: string; email: string; phone: string }[]
  >([]);
  const [selectedGuardianProfileId, setSelectedGuardianProfileId] = useState("");
  const [isLinkingGuardian, setIsLinkingGuardian] = useState(false);

  const toast = useToast();

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getStudentsAction(
      searchRef.current || undefined,
      statusFilter,
      pageRef.current,
      pageSize
    );
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
      supabase
        .from("academic_years")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("name", { ascending: false }),
      supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("name"),
    ]);

    setAcademicYears(yearsData || []);
    setClasses(classesData || []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadStudents();
  }, [loadStudents, page, searchQuery, statusFilter]);

  useEffect(() => {
    if (showBulkEnrollForm) {
      loadBulkEnrollLookups();
    }
  }, [showBulkEnrollForm, loadBulkEnrollLookups]);

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

  const handleGuardianSearch = useCallback(
    async (query: string) => {
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
        setGuardianSearchResults(
          result.guardians as {
            guardian_profile_id: string;
            full_name: string;
            email: string;
            phone: string;
          }[]
        );
      }
    },
    [toast]
  );

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
      toast.addToast(
        "success",
        `Berhasil menghubungkan ${result.linkedCount} siswa ke wali.`
      );
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
      toast.addToast("error", "Pilih file Excel/CSV terlebih dahulu.");
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
    date
      ? new Date(date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

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
          className="inline-flex items-center justify-center p-1 hover:bg-[#F5F3EC] rounded"
        >
          {students.length > 0 && selectedStudentIds.size === students.length ? (
            <CheckSquare className="h-4 w-4 text-[#0C3B2E]" />
          ) : (
            <Square className="h-4 w-4 text-[#8A8A8A]" />
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
          className="inline-flex items-center justify-center p-1 hover:bg-[#F5F3EC] rounded"
        >
          {selectedStudentIds.has(item.id) ? (
            <CheckSquare className="h-4 w-4 text-[#0C3B2E]" />
          ) : (
            <Square className="h-4 w-4 text-[#8A8A8A]" />
          )}
        </button>
      ),
      className: "w-10 text-center",
      mobileHide: true,
    },
    {
      key: "nis",
      header: "NIS",
      render: (item: Student) => <span className="font-semibold text-[#4A4A4A]">{item.nis}</span>,
    },
    {
      key: "full_name",
      header: "Nama Siswa",
      render: (item: Student) => <span className="font-bold text-[#1A1A1A]">{item.full_name}</span>,
    },
    {
      key: "birth_date",
      header: "Tanggal Lahir",
      render: (item: Student) => (
        <span className="text-[#7A7A7A] text-xs">{formatDate(item.birth_date)}</span>
      ),
      mobileHide: true,
    },
    {
      key: "status",
      header: "Status",
      render: (item: Student) => {
        const labels: Record<string, { label: string; bg: string; text: string }> = {
          active: { label: "Aktif", bg: "bg-[#0C3B2E]/10", text: "text-[#0C3B2E]" },
          inactive: { label: "Tidak Aktif", bg: "bg-[#7A7A7A]/10", text: "text-[#7A7A7A]" },
          graduated: { label: "Lulus", bg: "bg-[#2563EB]/10", text: "text-[#2563EB]" },
          transferred: { label: "Pindah", bg: "bg-[#C28E38]/10", text: "text-[#C28E38]" },
        };
        const conf = labels[item.status] || {
          label: item.status,
          bg: "bg-gray-100",
          text: "text-gray-700",
        };
        return (
          <span
            className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${conf.bg} ${conf.text}`}
          >
            {conf.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Student) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => router.push(`/dashboard/admin/students/${item.id}`)}
            className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#EAE6DC] transition-colors"
          >
            Detail
          </button>
          <button
            onClick={() => startEdit(item)}
            className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5 text-[#0C3B2E]" />
            Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
              Master Data Siswa
            </h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
              Kelola profil, riwayat akademik, dan status pendaftaran siswa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {formState === "list" && (
              <>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-3.5 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 text-[#0C3B2E]" />
                  <span>Export</span>
                </button>

                <button
                  onClick={() => setShowImportDialog(true)}
                  className="px-3.5 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5"
                >
                  <Upload className="h-4 w-4 text-[#C28E38]" />
                  <span>Import</span>
                </button>

                {selectedStudentIds.size > 0 && (
                  <>
                    <button
                      onClick={() => setShowBulkEnrollForm(true)}
                      className="px-3.5 py-2 bg-[#0C3B2E]/10 border border-[#0C3B2E]/30 text-[#0C3B2E] text-xs font-bold rounded-xl hover:bg-[#0C3B2E] hover:text-white transition-colors inline-flex items-center gap-1.5"
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>Enroll ({selectedStudentIds.size})</span>
                    </button>

                    <button
                      onClick={() => setShowBulkGuardianForm(true)}
                      className="px-3.5 py-2 bg-[#0C3B2E]/10 border border-[#0C3B2E]/30 text-[#0C3B2E] text-xs font-bold rounded-xl hover:bg-[#0C3B2E] hover:text-white transition-colors inline-flex items-center gap-1.5"
                    >
                      <Users className="h-4 w-4" />
                      <span>Hubungkan Wali</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    resetForm();
                    setFormState("create");
                  }}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm inline-flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Tambah Siswa</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{error}</p>
          </div>
        )}

        {submitError && (
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{submitError}</p>
          </div>
        )}

        {/* DIALOG IMPORT */}
        {showImportDialog && (
          <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-3">
              <h3 className="text-base font-bold text-[#1A1A1A]">Import Siswa dari Excel</h3>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className="text-[#8A8A8A] hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleImport}>
              <div>
                <label htmlFor="import-file" className="block text-xs font-bold text-[#555] mb-1.5">
                  Pilih File Excel / CSV
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
                  className="w-full p-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  disabled={isImporting}
                />
                <p className="text-[11px] text-[#8A8A8A] mt-1.5">
                  Mendukung format sederhana maupun Dapodik. Untuk format Dapodik, data orang tua akan otomatis terhubung.
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <a
                    href="/templates/students-template.xlsx"
                    download
                    className="text-[#0C3B2E] font-bold hover:underline"
                  >
                    Download Template Sederhana
                  </a>
                  <span className="text-[#CCC]">|</span>
                  <a
                    href="/templates/template_database_dapodik.xlsx"
                    download
                    className="text-[#0C3B2E] font-bold hover:underline"
                  >
                    Download Template Dapodik
                  </a>
                </div>
              </div>

              <div>
                <label htmlFor="import-academic-year" className="block text-xs font-bold text-[#555] mb-1.5">
                  Tahun Ajaran Target
                </label>
                <select
                  id="import-academic-year"
                  value={importAcademicYearId}
                  onChange={(e) => setImportAcademicYearId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  disabled={isImporting}
                >
                  <option value="">Pilih Tahun Ajaran</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isImporting || !importFile}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isImporting && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isImporting ? "Mengimport..." : "Mulai Import"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportDialog(false)}
                  disabled={isImporting}
                  className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>

            {importResult && (
              <div className="mt-4 p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8] space-y-2">
                <p className="text-xs font-bold text-[#1A1A1A]">
                  Hasil Import: {importResult.successCount} Berhasil (Baru: {importResult.insertedCount}, Update: {importResult.updatedCount}) | Gagal: {importResult.errorCount}
                </p>
              </div>
            )}
          </div>
        )}

        {/* BULK ENROLL FORM */}
        {showBulkEnrollForm && (
          <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">
              Enroll Bulk Siswa ({selectedStudentIds.size} Siswa Terpilih)
            </h3>
            <form className="space-y-4" onSubmit={handleBulkEnroll}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bulk-academic-year" className="block text-xs font-bold text-[#555] mb-1.5">
                    Tahun Ajaran
                  </label>
                  <select
                    id="bulk-academic-year"
                    value={bulkEnrollAcademicYearId}
                    onChange={(e) => setBulkEnrollAcademicYearId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isBulkEnrolling}
                  >
                    <option value="">Pilih Tahun Ajaran</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="bulk-class" className="block text-xs font-bold text-[#555] mb-1.5">
                    Kelas (Opsional)
                  </label>
                  <select
                    id="bulk-class"
                    value={bulkEnrollClassId}
                    onChange={(e) => setBulkEnrollClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    disabled={isBulkEnrolling}
                  >
                    <option value="">Tanpa Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isBulkEnrolling}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isBulkEnrolling && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isBulkEnrolling ? "Mendaftarkan..." : "Daftarkan Siswa"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkEnrollForm(false)}
                  disabled={isBulkEnrolling}
                  className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* BULK GUARDIAN FORM */}
        {showBulkGuardianForm && (
          <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">
              Hubungkan Wali ke {selectedStudentIds.size} Siswa Terpilih
            </h3>
            <form className="space-y-4" onSubmit={handleBulkLinkGuardian}>
              <div>
                <label htmlFor="guardian-search" className="block text-xs font-bold text-[#555] mb-1.5">
                  Cari Wali (Nama, Email, No HP)
                </label>
                <input
                  id="guardian-search"
                  type="text"
                  value={guardianSearchQuery}
                  onChange={(e) => handleGuardianSearch(e.target.value)}
                  placeholder="Ketik untuk mencari wali..."
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  disabled={isLinkingGuardian}
                />
                {guardianSearchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#E5E0D8] bg-[#FDFCF9]">
                    {guardianSearchResults.map((guardian) => (
                      <button
                        key={guardian.guardian_profile_id}
                        type="button"
                        onClick={() => {
                          setSelectedGuardianProfileId(guardian.guardian_profile_id);
                          setGuardianSearchQuery(
                            `${guardian.full_name} (${guardian.email})`
                          );
                          setGuardianSearchResults([]);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-[#F5F3EC] transition-colors border-b border-[#E5E0D8] last:border-b-0 ${
                          selectedGuardianProfileId === guardian.guardian_profile_id
                            ? "bg-[#0C3B2E]/10 font-bold text-[#0C3B2E]"
                            : ""
                        }`}
                      >
                        <p className="text-xs">{guardian.full_name}</p>
                        <p className="text-[10px] text-[#7A7A7A]">{guardian.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLinkingGuardian || !selectedGuardianProfileId}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isLinkingGuardian && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isLinkingGuardian ? "Hubungkan..." : "Simpan Relasi Wali"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkGuardianForm(false)}
                  disabled={isLinkingGuardian}
                  className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* FORM CREATE / EDIT */}
        {(formState === "create" || formState === "edit") && (
          <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">
              {formState === "create" ? "Tambah Siswa Baru" : "Edit Data Siswa"}
            </h3>
            <form
              className="space-y-4"
              onSubmit={formState === "create" ? handleCreate : handleUpdate}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nis" className="block text-xs font-bold text-[#555] mb-1.5">
                    NIS
                  </label>
                  <input
                    id="nis"
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-xs font-bold text-[#555] mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="birth_date" className="block text-xs font-bold text-[#555] mb-1.5">
                    Tanggal Lahir
                  </label>
                  <input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-xs font-bold text-[#555] mb-1.5">
                    Status
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    disabled={isSubmitting}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-xs font-bold text-[#555] mb-1.5">
                  Alamat
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isSubmitting && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFormState("list");
                    setEditingId(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LIST TABLE */}
        {formState === "list" && (
          <>
            <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari NIS atau nama siswa..."
                  className="w-full pl-10 pr-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A]"
                >
                  <option value="all">Semua Status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {(searchQuery || statusFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPage(1);
                    }}
                    className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl hover:bg-[#EAE6DC]"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              {isLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : (
                <DataTable
                  columns={columns}
                  data={students}
                  keyExtractor={(item) => item.id}
                  emptyTitle="Belum ada data siswa"
                  emptyDescription="Mulai dengan menambahkan siswa pertama atau impor dari file Excel."
                />
              )}

              {totalRows > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-[#EAE6DC] text-xs text-[#7A7A7A]">
                  <span>
                    Menampilkan {(page - 1) * pageSize + 1} -{" "}
                    {Math.min(page * pageSize, totalRows)} dari {totalRows} data
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1A1A] disabled:opacity-50"
                    >
                      Sebelumnya
                    </button>
                    <span className="font-bold text-[#1A1A1A]">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-bold text-[#1A1A1A] disabled:opacity-50"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}