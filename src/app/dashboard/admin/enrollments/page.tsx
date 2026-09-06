"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getEnrollmentsAction, createEnrollmentAction, updateEnrollmentAction } from "./actions";
import { Pencil } from "lucide-react";

type Enrollment = {
  id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string | null;
  created_at: string;
  students: { id: string; nis: string; full_name: string };
  academic_years: { id: string; name: string };
  classes: { id: string; name: string } | null;
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

  const [formData, setFormData] = useState({
    student_id: "",
    academic_year_id: "",
    class_id: "",
  });

  const [students, setStudents] = useState<{ id: string; nis: string; full_name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  const toast = useToast();

  const loadEnrollments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getEnrollmentsAction();
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setEnrollments(result.enrollments);
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
      supabase.from("classes").select("id, name").eq("school_id", profile.school_id).eq("is_active", true).order("name"),
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

  const columns = [
    {
      key: "student",
      header: "Siswa",
      render: (item: Enrollment) => (
        <div>
          <p className="text-foreground">{item.students.nis}</p>
          <p className="text-xs text-muted">{item.students.full_name}</p>
        </div>
      ),
    },
    { key: "academic_year", header: "Tahun Ajaran", render: (item: Enrollment) => item.academic_years.name, mobileHide: true },
    { key: "class", header: "Kelas", render: (item: Enrollment) => item.classes?.name || "-" },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: Enrollment) => (
        <button
          onClick={() => startEdit(item)}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
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
      </div>
    </PageContainer>
  );
}
