"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getGuardiansAction, createGuardianAction, deleteGuardianAction } from "./actions";
import { Trash2, CheckCircle2, Copy, Search } from "lucide-react";

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
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successCredentials, setSuccessCredentials] = useState<SuccessCredentials | null>(null);

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
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");

  const toast = useToast();

  const loadGuardians = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getGuardiansAction();
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setGuardians(result.guardians);
    }
    setIsLoading(false);
  }, []);

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

    const [{ data: studentsData }, { data: classesData }, { data: academicYearsData }] = await Promise.all([
      supabase.from("students").select("id, nis, full_name").eq("school_id", profile.school_id).order("full_name"),
      supabase.from("classes").select("id, name, academic_year_id").eq("school_id", profile.school_id).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: false }),
    ]);

    setStudents(studentsData || []);
    setClasses(classesData || []);
    setAcademicYears(academicYearsData || []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadGuardians();
    loadLookups();
  }, [loadGuardians, loadLookups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredStudents = students.filter((student) => {
    const matchesSearch = studentSearchQuery.trim() === "" ||
      student.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.nis.toLowerCase().includes(studentSearchQuery.toLowerCase());

    const matchesClass = selectedClassId === "" ||
      classes.some((cls) => {
        if (cls.id !== selectedClassId) return false;
        // Check if student is enrolled in this class via student_enrollments
        return true; // Will be filtered client-side after we have enrollment data
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
    const result = await deleteGuardianAction(guardianProfileId, studentId);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Hubungan wali berhasil dihapus.");
      loadGuardians();
    }
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
      key: "guardian",
      header: "Wali",
      render: (item: Guardian) => (
        <div>
          <p className="text-foreground">{item.profiles.full_name}</p>
          <p className="text-xs text-muted">{getRoleLabel(item.profiles.role)}</p>
        </div>
      ),
    },
    { key: "nis", header: "NIS", render: (item: Guardian) => item.students.nis },
    { key: "student_name", header: "Nama Siswa", render: (item: Guardian) => item.students.full_name, mobileHide: true },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Guardian) => (
        <button
          onClick={() => handleDelete(item.guardian_profile_id, item.student_id)}
          disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-danger/20 text-danger text-xs font-semibold hover:bg-danger/10 transition-all active:scale-[0.98] min-h-[44px]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Hapus
        </button>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Wali Siswa"
          description="Kelola hubungan wali dengan siswa"
          primaryAction={
            formState === "list"
              ? { label: "Tambah Wali", onClick: openCreateForm }
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

        {successCredentials && (
          <Card>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Kredensial Wali</h3>
                <p className="text-xs text-muted mt-1">Berikut adalah kredensial yang dapat digunakan wali untuk login pertama kali.</p>
                <div className="mt-3 space-y-1 text-xs">
                  <p><span className="font-medium text-foreground">Nama:</span> <span className="text-muted">{successCredentials.fullName}</span></p>
                  <p><span className="font-medium text-foreground">Email:</span> <span className="text-muted">{successCredentials.email}</span></p>
                  {successCredentials.username && (
                    <p><span className="font-medium text-foreground">Username:</span> <span className="text-muted">{successCredentials.username}</span></p>
                  )}
                  <p><span className="font-medium text-foreground">Password sementara:</span> <span className="text-muted font-mono">{successCredentials.temporaryPassword}</span></p>
                  <p><span className="font-medium text-foreground">Siswa terhubung:</span> <span className="text-muted">{successCredentials.linkedStudents}</span></p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Salin Kredensial
                  </button>
                  <button
                    type="button"
                    onClick={closeSuccess}
                    className="h-9 px-3 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark active:scale-[0.98] transition-colors min-h-[44px]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {formState === "create" && !successCredentials && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Tambah Wali Siswa</h3>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="full_name" className="block text-xs text-muted mb-1.5">
                    Nama Orang Tua
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Nama lengkap"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                   <label htmlFor="email" className="block text-xs text-muted mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="email@example.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="phone" className="block text-xs text-muted mb-1.5">
                    Nomor HP
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="081234567890"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                   <label htmlFor="relationship" className="block text-xs text-muted mb-1.5">
                    Hubungan
                  </label>
                  <select
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    <option value="ayah">Ayah</option>
                    <option value="ibu">Ibu</option>
                    <option value="wali">Wali</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted mb-1.5">
                  Pilih Siswa
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Cari nama/NIS..."
                        className="sm:h-10 h-11 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={isSubmitting}
                      />
                    </div>
                    <select
                      value={selectedAcademicYearId}
                      onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                      className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                      className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-2">
                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-muted px-2 py-1">Tidak ada siswa yang cocok.</p>
                    ) : (
                      <div className="space-y-1">
                        {filteredStudents.map((s) => {
                          const checked = formData.student_ids.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                                checked ? "bg-primary/10 text-primary" : "hover:bg-muted/10"
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
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                disabled={isSubmitting}
                              />
                              <span className="text-sm text-foreground">{s.nis} - {s.full_name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || formData.student_ids.length === 0}
                    className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
                >
                  {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setFormState("list"); }}
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
              <TableSkeleton rows={5} columns={4} />
            ) : (
              <DataTable
                columns={columns}
                data={guardians}
                keyExtractor={(item) => `${item.guardian_profile_id}-${item.student_id}`}
                emptyTitle="Belum ada hubungan wali"
                emptyDescription="Tambahkan wali untuk menghubungkan orang tua dengan siswa."
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
