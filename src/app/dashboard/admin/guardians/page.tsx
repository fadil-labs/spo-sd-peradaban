"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import {
  getGuardiansAction,
  createGuardianAction,
  deleteGuardianAction,
  bulkDeleteGuardiansAction,
  exportGuardiansAction,
  importGuardiansAction,
} from "./actions";
import { Trash2, CheckCircle2, Copy, Search, Download, Upload, UserPlus, X, RefreshCw } from "lucide-react";

type Guardian = {
  guardian_profile_id: string;
  student_id: string;
  created_at: string;
  profiles: { id: string; full_name: string; role: string };
  students: { id: string; nis: string; full_name: string };
};

type FormState = "list" | "create";

type SuccessCredentials = {
  email: string;
  temporaryPassword: string;
  fullName: string;
  linkedStudents: number;
  username: string | null;
};

type ClassOption = {
  id: string;
  name: string;
  academic_year_id: string;
};

type AcademicYearOption = {
  id: string;
  name: string;
};

export default function GuardiansPage() {
  const router = useRouter();
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successCredentials, setSuccessCredentials] = useState<SuccessCredentials | null>(null);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    relationship: "ayah",
    student_ids: [] as string[],
  });

  const [students, setStudents] = useState<{ id: string; nis: string; full_name: string }[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [enrollments, setEnrollments] = useState<{ student_id: string; class_id: string }[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    insertedCount: number;
    updatedCount: number;
    errorCount: number;
    results: { row: number; email: string; nis: string; status: "inserted" | "updated" | "error"; message?: string }[];
  } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toast = useToast();

  const loadGuardians = useCallback(
    async (pageNum?: number) => {
      setIsLoading(true);
      setError(null);
      const result = await getGuardiansAction(
        pageNum || page,
        20,
        searchQuery,
        filterClassId,
        filterAcademicYearId
      );
      if ("error" in result) {
        setError(result.error || "Gagal memuat data wali.");
      } else {
        setGuardians(result.guardians);
        setTotalRows(result.totalRows);
        if (pageNum) setPage(pageNum);
      }
      setIsLoading(false);
    },
    [page, searchQuery, filterClassId, filterAcademicYearId]
  );

  const loadLookups = useCallback(async () => {
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

    const [
      { data: studentsData },
      { data: classesData },
      { data: academicYearsData },
      { data: enrollmentsData },
    ] = await Promise.all([
      supabase.from("students").select("id, nis, full_name").eq("school_id", profile.school_id).order("full_name"),
      supabase.from("classes").select("id, name, academic_year_id").eq("school_id", profile.school_id).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: false }),
      supabase.from("student_enrollments").select("student_id, class_id").eq("school_id", profile.school_id),
    ]);

    setStudents(studentsData || []);
    setClasses(classesData || []);
    setAcademicYears(academicYearsData || []);
    setEnrollments(enrollmentsData || []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadGuardians(page);
  }, [page, loadGuardians, searchQuery, filterClassId, filterAcademicYearId]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      studentSearchQuery.trim() === "" ||
      student.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.nis.toLowerCase().includes(studentSearchQuery.toLowerCase());

    const matchesClass =
      selectedClassId === "" ||
      enrollments.some((enrollment) => {
        if (enrollment.student_id !== student.id) return false;
        if (enrollment.class_id !== selectedClassId) return false;
        return true;
      });

    return matchesSearch && matchesClass;
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      relationship: "ayah",
      student_ids: [],
    });
    setSubmitError(null);
    setStudentSearchQuery("");
    setSelectedClassId("");
    setSelectedAcademicYearId("");
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterClassId("");
    setFilterAcademicYearId("");
    setPage(1);
    setSelectedIds(new Set());
  };

  const openCreateForm = async () => {
    await loadLookups();
    resetForm();
    setSuccessCredentials(null);
    setFormState("create");
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("full_name", formData.full_name);
    formDataObj.append("email", formData.email);
    formDataObj.append("phone", formData.phone);
    formDataObj.append("relationship", formData.relationship);
    formData.student_ids.forEach((id) => formDataObj.append("student_ids", id));

    const result = await createGuardianAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else if (result.success && result.credentials) {
      setSuccessCredentials(result.credentials);
      toast.addToast("success", "Wali berhasil dibuat.");
      loadGuardians();
    } else {
      toast.addToast("success", "Wali berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadGuardians();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (guardianProfileId: string, studentId: string) => {
    if (!confirm("Hapus hubungan wali ini?")) return;
    const result = await deleteGuardianAction(guardianProfileId, studentId);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Hubungan wali berhasil dihapus.");
      loadGuardians();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`Hapus ${selectedIds.size} hubungan wali yang dipilih?`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    const payload = Array.from(selectedIds).map((key) => {
      const [guardianProfileId, studentId] = key.split("|||");
      return { guardian_profile_id: guardianProfileId, student_id: studentId };
    });

    const result = await bulkDeleteGuardiansAction(payload);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", `${result.deletedCount} hubungan wali berhasil dihapus.`);
      setSelectedIds(new Set());
      loadGuardians();
    }
    setIsBulkDeleting(false);
  };

  const copyCredentials = async () => {
    if (!successCredentials) return;
    const lines = [
      `Nama: ${successCredentials.fullName}`,
      `Email: ${successCredentials.email}`,
      successCredentials.username ? `Username: ${successCredentials.username}` : null,
      `Password: ${successCredentials.temporaryPassword}`,
      `Siswa terhubung: ${successCredentials.linkedStudents}`,
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.addToast("success", "Kredensial berhasil disalin.");
    } catch {
      toast.addToast("error", "Gagal menyalin kredensial.");
    }
  };

  const closeSuccess = () => {
    setSuccessCredentials(null);
    resetForm();
    setFormState("list");
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportGuardiansAction();
      if ("error" in result) {
        toast.addToast("error", result.error || "Terjadi kesalahan.");
      } else if (result.success && result.data) {
        const { downloadExcel } = await import("@/lib/import-export/excel");
        downloadExcel(result.data.filename, result.data.blob);
        toast.addToast("success", "Export wali berhasil.");
      }
    } catch {
      toast.addToast("error", "Gagal export wali.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!importFile) {
      toast.addToast("error", "Pilih file CSV/Excel terlebih dahulu.");
      return;
    }

    setIsImporting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", importFile);
      const result = await importGuardiansAction(formDataObj);
      if ("error" in result) {
        toast.addToast("error", result.error || "Terjadi kesalahan.");
      } else if (result.success && result.data) {
        setImportResult(result.data);
        const { insertedCount, updatedCount, errorCount } = result.data;
        const message = `Import selesai: ${insertedCount} baru, ${updatedCount} diperbarui, ${errorCount} gagal.`;
        toast.addToast("success", message);
        loadGuardians();
      }
    } catch {
      toast.addToast("error", "Gagal import wali.");
    } finally {
      setIsImporting(false);
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
      key: "guardian",
      header: "Wali",
      render: (item: Guardian) => (
        <div>
          <p className="font-bold text-[#1A1A1A]">{item.profiles.full_name}</p>
          <span className="inline-block px-2 py-0.5 rounded-md bg-[#0C3B2E]/10 text-[#0C3B2E] text-[10px] font-bold mt-0.5">
            {getRoleLabel(item.profiles.role)}
          </span>
        </div>
      ),
    },
    {
      key: "nis",
      header: "NIS",
      render: (item: Guardian) => (
        <span className="font-semibold text-[#4A4A4A]">{item.students.nis}</span>
      ),
    },
    {
      key: "student_name",
      header: "Nama Siswa",
      render: (item: Guardian) => (
        <span className="font-bold text-[#1A1A1A]">{item.students.full_name}</span>
      ),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Guardian) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => router.push(`/dashboard/admin/guardians/${item.guardian_profile_id}`)}
            className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#EAE6DC] transition-colors"
          >
            Detail
          </button>
          <button
            onClick={() => handleDelete(item.guardian_profile_id, item.student_id)}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-[#A83A32]/10 border border-[#A83A32]/20 text-[#A83A32] text-xs font-semibold rounded-xl hover:bg-[#A83A32] hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[1600px] mx-auto">
        
        {/* HEADER HALAMAN */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
              Wali Siswa
            </h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
              Kelola hubungan data wali dan orang tua dengan siswa.
            </p>
          </div>

          {/* ACTION BUTTONS */}
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

                <button
                  onClick={openCreateForm}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm inline-flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Tambah Wali</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4 flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{error}</p>
            <button
              onClick={() => loadGuardians(1)}
              className="px-3 py-1 bg-[#A83A32] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Coba Lagi
            </button>
          </div>
        )}

        {submitError && (
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{submitError}</p>
          </div>
        )}

        {/* CREDENTIALS SUCCESS DISPLAY */}
        {successCredentials && (
          <div className="rounded-[20px] border border-[#0C3B2E]/30 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-[#0C3B2E] shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#1A1A1A]">Kredensial Wali Berhasil Dibuat</h3>
                <p className="text-xs text-[#555] mt-0.5">
                  Salin kredensial berikut untuk dikirimkan kepada orang tua murid.
                </p>
                <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-200 space-y-1 text-xs">
                  <p><span className="font-bold text-[#1A1A1A]">Nama:</span> {successCredentials.fullName}</p>
                  <p><span className="font-bold text-[#1A1A1A]">Email:</span> {successCredentials.email}</p>
                  {successCredentials.username && (
                    <p><span className="font-bold text-[#1A1A1A]">Username:</span> {successCredentials.username}</p>
                  )}
                  <p><span className="font-bold text-[#1A1A1A]">Password Sementara:</span> <span className="font-mono font-bold text-[#0C3B2E]">{successCredentials.temporaryPassword}</span></p>
                  <p><span className="font-bold text-[#1A1A1A]">Siswa Terhubung:</span> {successCredentials.linkedStudents} Siswa</p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-colors inline-flex items-center gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Salin Kredensial
                  </button>
                  <button
                    type="button"
                    onClick={closeSuccess}
                    className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#EAE6DC]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IMPORT DIALOG */}
        {showImportDialog && (
          <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAE6DC]">
              <h3 className="text-base font-bold text-[#1A1A1A]">Import Wali Siswa dari Excel</h3>
              <button onClick={() => setShowImportDialog(false)} className="text-[#8A8A8A] hover:text-black">
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
                  Format Kolom: <strong>Nama Wali, Email, No HP, Hubungan, NIS Siswa, Nama Siswa</strong>
                </p>
                <a
                  href="/templates/guardians-template.xlsx"
                  download
                  className="inline-flex items-center gap-1 mt-2 text-xs text-[#0C3B2E] font-bold hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download Template Excel
                </a>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isImporting || !importFile}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isImporting && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {isImporting ? "Mengimport..." : "Mulai Import"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }}
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

        {/* CREATE GUARDIAN FORM */}
        {formState === "create" && !successCredentials && (
          <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">Tambah Wali Siswa Baru</h3>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="full_name" className="block text-xs font-bold text-[#555] mb-1.5">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                    placeholder="Nama lengkap"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-[#555] mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                    placeholder="email@example.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-[#555] mb-1.5">
                    Nomor HP / WhatsApp
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                    placeholder="081234567890"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="relationship" className="block text-xs font-bold text-[#555] mb-1.5">
                    Hubungan
                  </label>
                  <select
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                    disabled={isSubmitting}
                  >
                    <option value="ayah">Ayah</option>
                    <option value="ibu">Ibu</option>
                    <option value="wali">Wali</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#555] mb-1.5">
                  Pilih Siswa yang Terhubung
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8A8A]" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Cari nama/NIS..."
                        className="w-full pl-9 pr-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                        disabled={isSubmitting}
                      />
                    </div>
                    <select
                      value={selectedAcademicYearId}
                      onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                      className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                      disabled={isSubmitting}
                    >
                      <option value="">Semua Tahun Ajaran</option>
                      {academicYears.map((ay) => (
                        <option key={ay.id} value={ay.id}>{ay.name}</option>
                      ))}
                    </select>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                      disabled={isSubmitting}
                    >
                      <option value="">Semua Kelas</option>
                      {classes
                        .filter((cls) => !selectedAcademicYearId || cls.academic_year_id === selectedAcademicYearId)
                        .map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-[#E5E0D8] bg-[#FDFCF9] p-2 space-y-1">
                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-[#8A8A8A] p-2">Tidak ada siswa yang cocok.</p>
                    ) : (
                      filteredStudents.map((s) => {
                        const checked = formData.student_ids.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors ${
                              checked ? "bg-[#0C3B2E]/10 text-[#0C3B2E] font-bold" : "hover:bg-[#F5F3EC]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  student_ids: e.target.checked
                                    ? [...prev.student_ids, s.id]
                                    : prev.student_ids.filter((id) => id !== s.id),
                                }));
                              }}
                              className="rounded border-[#E5E0D8] accent-[#0C3B2E]"
                              disabled={isSubmitting}
                            />
                            <span className="text-xs">{s.nis} - {s.full_name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || formData.student_ids.length === 0}
                  className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {isSubmitting ? "Menyimpan..." : "Simpan Wali"}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setFormState("list"); }}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TABEL DATA WALI (LIST VIEW) */}
        {formState === "list" && (
          <>
            {/* FILTER BAR */}
            <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Cari nama wali, NIS, atau nama siswa..."
                  className="w-full pl-10 pr-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterAcademicYearId}
                  onChange={(e) => { setFilterAcademicYearId(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A]"
                >
                  <option value="">Semua Tahun Ajaran</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>

                <select
                  value={filterClassId}
                  onChange={(e) => { setFilterClassId(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A]"
                >
                  <option value="">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl hover:bg-[#EAE6DC]"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* BATCH DELETE BAR */}
            {selectedIds.size > 0 && (
              <div className="rounded-[20px] border border-[#A83A32]/30 bg-white p-3.5 shadow-sm flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1A1A]">
                  {selectedIds.size} data wali dipilih
                </span>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-3.5 py-1.5 bg-[#A83A32] text-white text-xs font-bold rounded-xl hover:bg-[#852C25] inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isBulkDeleting ? "Menghapus..." : "Hapus Terpilih"}
                </button>
              </div>
            )}

            {/* DATA TABLE */}
            <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              {isLoading ? (
                <TableSkeleton rows={5} columns={4} />
              ) : (
                <DataTable
                  columns={columns}
                  data={guardians}
                  keyExtractor={(item) => `${item.guardian_profile_id}|||${item.student_id}`}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  getSelectableId={(item) => `${item.guardian_profile_id}|||${item.student_id}`}
                  emptyTitle="Belum ada data wali siswa"
                  emptyDescription="Tambahkan wali baru atau lakukan import data dari Excel."
                />
              )}

              {/* PAGINATION */}
              {totalRows > 20 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-[#EAE6DC] text-xs text-[#7A7A7A]">
                  <span>
                    Menampilkan {(page - 1) * 20 + 1} - {Math.min(page * 20, totalRows)} dari {totalRows} data
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
                      {page} / {Math.ceil(totalRows / 20)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= Math.ceil(totalRows / 20)}
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