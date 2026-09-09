"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/operational/search-input";
import { useToast } from "@/components/ui/toast";
import { getEnrollmentsAction, createEnrollmentAction, updateEnrollmentAction, deleteEnrollmentAction } from "./actions";
import { Pencil, CheckSquare, Square, Users, Trash2 } from "lucide-react";

type Enrollment = {
  id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string | null;
  created_at: string;
  students: { id: string; nis: string; full_name: string } | null;
  academic_years: { id: string; name: string } | null;
  classes: { id: string; name: string }[];
};

type FormState = "list" | "create" | "edit";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  const [formData, setFormData] = useState({
    student_id: "",
    academic_year_id: "",
    class_id: "",
  });

  const [students, setStudents] = useState<{ id: string; nis: string; full_name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkAcademicYearId, setBulkAcademicYearId] = useState("");
  const [bulkClassId, setBulkClassId] = useState("");
  const [isBulkEnrolling, setIsBulkEnrolling] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [enrollmentMode, setEnrollmentMode] = useState<"single" | "bulk">("single");

  const toast = useToast();

  const loadEnrollments = useCallback(async (pageNum?: number) => {
    setIsLoading(true);
    setError(null);
    const result = await getEnrollmentsAction(pageNum || pageRef.current, 20, searchRef.current || undefined);
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setEnrollments(result.enrollments);
      setTotalRows(result.totalRows);
      if (pageNum) setPage(pageNum);
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

    const [{ data: studentsData }, { data: yearsData }, { data: classesData }] = await Promise.all([
      supabase.from("students").select("id, nis, full_name").eq("school_id", profile.school_id).order("full_name"),
      supabase.from("academic_years").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: false }),
      supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name"),
    ]);

    setStudents(studentsData || []);
    setAcademicYears(yearsData || []);
    setClasses(classesData || []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadEnrollments();
    loadLookups();
  }, [loadEnrollments, loadLookups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData({ student_id: "", academic_year_id: "", class_id: "" });
    setSubmitError(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("student_id", formData.student_id);
    formDataObj.append("academic_year_id", formData.academic_year_id);
    formDataObj.append("class_id", formData.class_id);

    const result = await createEnrollmentAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Pendaftaran berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadEnrollments();
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
    formDataObj.append("class_id", formData.class_id);

    const result = await updateEnrollmentAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Pendaftaran berhasil diperbarui.");
      resetForm();
      setFormState("list");
      setEditingId(null);
      loadEnrollments();
    }
    setIsSubmitting(false);
  };

  const startEdit = (enrollment: Enrollment) => {
    setEditingId(enrollment.id);
    setFormData({
      student_id: enrollment.student_id,
      academic_year_id: enrollment.academic_year_id,
      class_id: enrollment.class_id || "",
    });
    setFormState("edit");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus pendaftaran ini?")) return;

    const formDataObj = new FormData();
    formDataObj.append("id", id);

    const result = await deleteEnrollmentAction(formDataObj);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Pendaftaran berhasil dihapus.");
      loadEnrollments();
    }
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
    if (selectedStudentIds.size === 0 || !bulkAcademicYearId || !bulkClassId) {
      toast.addToast("error", "Pilih siswa, tahun ajaran, dan kelas terlebih dahulu.");
      return;
    }

    setIsBulkEnrolling(true);
    setBulkProgress({ current: 0, total: selectedStudentIds.size });
    let successCount = 0;
    let errorCount = 0;

    for (const studentId of selectedStudentIds) {
      const formDataObj = new FormData();
      formDataObj.append("student_id", studentId);
      formDataObj.append("academic_year_id", bulkAcademicYearId);
      formDataObj.append("class_id", bulkClassId);

      const result = await createEnrollmentAction(formDataObj);
      if ("error" in result) {
        errorCount += 1;
      } else {
        successCount += 1;
      }
      setBulkProgress((prev) => ({ ...prev, current: prev.current + 1 }));
    }

    setIsBulkEnrolling(false);
    setSelectedStudentIds(new Set());
    setBulkAcademicYearId("");
    setBulkClassId("");

    if (errorCount === 0) {
      toast.addToast("success", `Berhasil mendaftarkan ${successCount} siswa.`);
    } else {
      toast.addToast("error", `Selesai: ${successCount} berhasil, ${errorCount} gagal.`);
    }

    loadEnrollments();
  };

  const columns = [
    {
      key: "select",
      header: (
        <button
          onClick={toggleSelectAll}
          className="flex items-center justify-center w-5 h-5"
          title={selectedStudentIds.size === students.length ? "Batalkan semua" : "Pilih semua"}
        >
          {selectedStudentIds.size === students.length ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted" />
          )}
        </button>
      ),
      render: (item: Enrollment) => (
        <button
          onClick={() => toggleStudentSelection(item.student_id)}
          className="flex items-center justify-center w-5 h-5"
          title={selectedStudentIds.has(item.student_id) ? "Batalkan pilihan" : "Pilih siswa ini"}
        >
          {selectedStudentIds.has(item.student_id) ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted" />
          )}
        </button>
      ),
      className: "w-12 text-center",
      mobileHide: true,
    },
    {
      key: "student",
      header: "Siswa",
      render: (item: Enrollment) => (
        <div>
          <p className="text-foreground">{item.students?.nis || "-"}</p>
          <p className="text-xs text-muted">{item.students?.full_name || "-"}</p>
        </div>
      ),
    },
    { key: "academic_year", header: "Tahun Ajaran", render: (item: Enrollment) => item.academic_years?.name || "-", mobileHide: true },
    { key: "class", header: "Kelas", render: (item: Enrollment) => (Array.isArray(item.classes) ? item.classes[0]?.name || "-" : "-") },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Enrollment) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => startEdit(item)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-danger/20 text-danger text-xs font-semibold hover:bg-danger/10 transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </button>
        </div>
      ),
    },
  ];

  const EmptyIcon = () => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.5 4.5 0 00-7.536-7.536 9.337 9.337 0 00-.952 4.121A9.37 9.37 0 0112 3.75a9.37 9.37 0 01.75 3.128m-6.75 5.128a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm13.5 0a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Pendaftaran Siswa"
          description="Kelola pendaftaran siswa ke tahun ajaran dan kelas"
          primaryAction={
            formState === "list"
              ? { label: "Daftarkan Siswa", onClick: () => { resetForm(); setFormState("create"); } }
              : undefined
          }
          secondaryActions={
            formState === "list"
              ? [
                  {
                    label: enrollmentMode === "bulk" ? "Batal Bulk" : "Daftarkan Massal",
                    onClick: () => {
                      if (enrollmentMode === "bulk") {
                        setEnrollmentMode("single");
                        setSelectedStudentIds(new Set());
                      } else {
                        setEnrollmentMode("bulk");
                      }
                    },
                    icon: enrollmentMode === "bulk" ? <Square className="h-4 w-4" /> : <Users className="h-4 w-4" />,
                  },
                ]
              : []
          }
        />

        <div className="flex items-center gap-4">
          <SearchInput
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setPage(1);
            }}
            placeholder="Cari siswa, tahun ajaran, atau kelas..."
          />
        </div>

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

        {selectedStudentIds.size > 0 && formState === "list" && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">
              Daftarkan Siswa Terpilih ({selectedStudentIds.size})
            </h3>
            <form className="space-y-4" onSubmit={handleBulkEnroll}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bulk_academic_year_id" className="block text-xs text-muted mb-1.5">
                    Tahun Ajaran
                  </label>
                  <select
                    id="bulk_academic_year_id"
                    value={bulkAcademicYearId}
                    onChange={(e) => setBulkAcademicYearId(e.target.value)}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isBulkEnrolling}
                  >
                    <option value="">Pilih tahun ajaran</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>{ay.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bulk_class_id" className="block text-xs text-muted mb-1.5">
                    Kelas
                  </label>
                  <select
                    id="bulk_class_id"
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isBulkEnrolling}
                  >
                    <option value="">Pilih kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
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
                  {isBulkEnrolling ? `Mendaftarkan... (${bulkProgress.current}/${bulkProgress.total})` : "Daftarkan Siswa Terpilih"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(new Set())}
                  disabled={isBulkEnrolling}
                  className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
                >
                  Batalkan
                </button>
              </div>
            </form>
          </Card>
        )}

        {(formState === "create" || formState === "edit") && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">
              {formState === "create" ? "Daftarkan Siswa" : "Ubah Kelas Siswa"}
            </h3>
            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div>
                 <label htmlFor="student_id" className="block text-xs text-muted mb-1.5">
                  Siswa
                </label>
                <select
                  id="student_id"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isSubmitting || formState === "edit"}
                >
                  <option value="">Pilih siswa</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nis} - {s.full_name}</option>
                  ))}
                </select>
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
                 <label htmlFor="class_id" className="block text-xs text-muted mb-1.5">
                  Kelas
                </label>
                <select
                  id="class_id"
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="">Belum ada kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
            {enrollmentMode === "bulk" ? (
              <Card>
                <h3 className="text-base font-semibold text-foreground mb-4">Pilih Siswa untuk Didaftarkan</h3>
                <p className="text-xs text-muted mb-4">Pilih siswa yang akan didaftarkan ke tahun ajaran dan kelas yang dipilih.</p>
                {isLoading ? (
                  <TableSkeleton rows={5} columns={4} />
                ) : students.length === 0 ? (
                  <EmptyState
                    title="Belum ada siswa"
                    description="Tambahkan siswa terlebih dahulu sebelum melakukan pendaftaran massal."
                  />
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 border-b border-border bg-muted/20">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-muted w-12 text-center">Pilih</th>
                            <th className="text-left py-3 px-4 font-medium text-muted">NIS</th>
                            <th className="text-left py-3 px-4 font-medium text-muted">Nama Siswa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {students.map((student) => (
                            <tr
                              key={student.id}
                              className="hover:bg-muted/5 cursor-pointer"
                              onClick={() => toggleStudentSelection(student.id)}
                            >
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center w-5 h-5 mx-auto">
                                  {selectedStudentIds.has(student.id) ? (
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Square className="h-4 w-4 text-muted" />
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-foreground">{student.nis}</td>
                              <td className="py-3 px-4 text-foreground">{student.full_name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <>
                {isLoading ? (
                  <TableSkeleton rows={5} columns={4} />
                ) : (
                  <DataTable
                    columns={columns}
                    data={enrollments}
                    keyExtractor={(item) => item.id}
                    emptyTitle="Belum ada pendaftaran"
                    emptyDescription="Daftarkan siswa ke tahun ajaran dan kelas."
                    emptyIcon={EmptyIcon}
                  />
                )}
              </>
            )}
          </>
        )}

        {totalRows > 20 && !isLoading && formState === "list" && enrollmentMode === "single" && (
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
