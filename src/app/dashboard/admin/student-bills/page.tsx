"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/operational/StatusBadge";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getStudentBillsAction, createStudentBillAction } from "./actions";
import { ExternalLink, Search } from "lucide-react";

type StudentBill = {
  id: string;
  amount: number;
  status: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  is_recurring: boolean;
  due_date: string | null;
  created_at: string;
  students: { id: string; nis: string; full_name: string } | null;
  payment_categories: { id: string; name: string; allow_installments: boolean; minimum_installment_amount: number | null } | null;
};

type FormState = "list" | "create";

type ClassOption = {
  id: string;
  name: string;
  academic_year_id: string;
};

type AcademicYearOption = {
  id: string;
  name: string;
};

export default function StudentBillsPage() {
  const [bills, setBills] = useState<StudentBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalRows, setTotalRows] = useState(0);

  const [formData, setFormData] = useState({
    student_id: "",
    student_enrollment_id: "",
    payment_category_id: "",
    amount: "",
    is_recurring: false,
    billing_period_start: "",
    billing_period_end: "",
    due_date: "",
  });

  const [students, setStudents] = useState<{ id: string; nis: string; full_name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [enrollments, setEnrollments] = useState<{ id: string; student_id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");

  const toast = useToast();

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getStudentBillsAction(undefined, "all", page, pageSize);
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setBills(result.bills);
      setTotalRows(result.totalRows);
    }
    setIsLoading(false);
  }, [page, pageSize]);

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

    const [{ data: studentsData }, { data: categoriesData }, { data: enrollmentsData }, { data: classesData }, { data: academicYearsData }] = await Promise.all([
      supabase.from("students").select("id, nis, full_name").eq("school_id", profile.school_id).order("full_name"),
      supabase.from("payment_categories").select("id, name").eq("school_id", profile.school_id).order("name"),
      supabase.from("student_enrollments").select("id, student_id, classes(name), academic_year_id").eq("school_id", profile.school_id),
      supabase.from("classes").select("id, name, academic_year_id").eq("school_id", profile.school_id).order("name"),
      supabase.from("academic_years").select("id, name").eq("school_id", profile.school_id).order("name", { ascending: false }),
    ]);

    setStudents(studentsData || []);
    setCategories(categoriesData || []);
    setEnrollments(
      (enrollmentsData || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        student_id: e.student_id as string,
        name: `${(e.classes as Record<string, unknown> | undefined)?.name || ""}`,
      }))
    );
    setClasses(classesData || []);
    setAcademicYears(academicYearsData || []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadBills();
    loadLookups();
  }, [loadBills, loadLookups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData({
      student_id: "",
      student_enrollment_id: "",
      payment_category_id: "",
      amount: "",
      is_recurring: false,
      billing_period_start: "",
      billing_period_end: "",
      due_date: "",
    });
    setSubmitError(null);
    setStudentSearchQuery("");
    setSelectedClassId("");
    setSelectedAcademicYearId("");
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = studentSearchQuery.trim() === "" ||
      student.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.nis.toLowerCase().includes(studentSearchQuery.toLowerCase());

    const matchesClass = selectedClassId === "" ||
      enrollments.some((en) => en.student_id === student.id);

    return matchesSearch && matchesClass;
  });

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesStudent = formData.student_id === "" || enrollment.student_id === formData.student_id;
    const matchesClass = selectedClassId === "" || classes.some((cls) => cls.id === selectedClassId);
    const matchesAcademicYear = selectedAcademicYearId === "" || enrollments.some((en) => en.student_id === enrollment.student_id);

    return matchesStudent && matchesClass && matchesAcademicYear;
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("student_id", formData.student_id);
    formDataObj.append("student_enrollment_id", formData.student_enrollment_id);
    formDataObj.append("payment_category_id", formData.payment_category_id);
    formDataObj.append("amount", formData.amount);
    formDataObj.append("is_recurring", String(formData.is_recurring));
    formDataObj.append("billing_period_start", formData.billing_period_start);
    formDataObj.append("billing_period_end", formData.billing_period_end);
    formDataObj.append("due_date", formData.due_date);

    const result = await createStudentBillAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Tagihan berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadBills();
    }
    setIsSubmitting(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const columns = [
    {
      key: "student",
      header: "Siswa",
      render: (item: StudentBill) => (
        <div>
          <p className="text-foreground">{item.students?.full_name || "-"}</p>
          <p className="text-xs text-muted">{item.students?.nis || "-"}</p>
        </div>
      ),
    },
    { key: "category", header: "Kategori", render: (item: StudentBill) => item.payment_categories?.name || "-", mobileHide: true },
    {
      key: "amount",
      header: "Jumlah",
      className: "text-right",
      render: (item: StudentBill) => (
        <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
      ),
      sortable: true,
    },
    { key: "status", header: "Status", render: (item: StudentBill) => <StatusBadge status={item.status} /> },
    {
      key: "due_date",
      header: "Jatuh Tempo",
      render: (item: StudentBill) => formatDate(item.due_date),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: StudentBill) => (
        <a
          href={`/dashboard/admin/student-bills/${item.id}`}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Detail
        </a>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Tagihan Siswa"
          description="Kelola tagihan dan pembayaran siswa"
          primaryAction={
            formState === "list"
              ? { label: "Buat Tagihan", onClick: () => setFormState("create") }
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

        {formState === "create" && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Buat Tagihan Baru</h3>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="student_id" className="block text-xs text-muted mb-1.5">
                    Siswa
                  </label>
                  <div className="space-y-2">
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
                      id="student_id"
                      value={formData.student_id}
                      onChange={(e) => setFormData({ ...formData, student_id: e.target.value, student_enrollment_id: "" })}
                      className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                      disabled={isSubmitting}
                    >
                      <option value="">Pilih siswa</option>
                      {filteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.nis} - {s.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                   <label htmlFor="student_enrollment_id" className="block text-xs text-muted mb-1.5">
                    Pendaftaran (Opsional)
                  </label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
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
                    <select
                      id="student_enrollment_id"
                      value={formData.student_enrollment_id}
                      onChange={(e) => setFormData({ ...formData, student_enrollment_id: e.target.value })}
                      className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={isSubmitting}
                    >
                      <option value="">Tidak ada</option>
                      {filteredEnrollments.map((en) => (
                        <option key={en.id} value={en.id}>{en.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label htmlFor="payment_category_id" className="block text-xs text-muted mb-1.5">
                    Kategori Pembayaran
                  </label>
                  <select
                    id="payment_category_id"
                    value={formData.payment_category_id}
                    onChange={(e) => setFormData({ ...formData, payment_category_id: e.target.value })}
                    className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                   <label htmlFor="amount" className="block text-xs text-muted mb-1.5">
                    Jumlah Tagihan
                  </label>
                  <input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                     className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="500000"
                    required
                    min="0"
                    step="1000"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="is_recurring"
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <label htmlFor="is_recurring" className="text-sm text-foreground">
                  Tagihan berulang
                </label>
              </div>

              {formData.is_recurring && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label htmlFor="billing_period_start" className="block text-xs text-muted mb-1.5">
                      Periode Mulai
                    </label>
                    <input
                      id="billing_period_start"
                      type="date"
                      value={formData.billing_period_start}
                      onChange={(e) => setFormData({ ...formData, billing_period_start: e.target.value })}
                      className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required={formData.is_recurring}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                     <label htmlFor="billing_period_end" className="block text-xs text-muted mb-1.5">
                      Periode Selesai
                    </label>
                    <input
                      id="billing_period_end"
                      type="date"
                      value={formData.billing_period_end}
                      onChange={(e) => setFormData({ ...formData, billing_period_end: e.target.value })}
                      className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      required={formData.is_recurring}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              <div>
                 <label htmlFor="due_date" className="block text-xs text-muted mb-1.5">
                  Jatuh Tempo (Opsional)
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  {isSubmitting ? "Menyimpan..." : "Buat Tagihan"}
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">
                Menampilkan {bills.length} dari {totalRows} tagihan
              </p>
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

            {isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : (
              <DataTable
                columns={columns}
                data={bills}
                keyExtractor={(item) => item.id}
                emptyTitle="Belum ada tagihan"
                emptyDescription="Buat tagihan pertama untuk siswa."
                emptyIcon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m-6 0h-.375c-.621 0-1.125-.504-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125h.375m6 0h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m-6 0h-.375c-.621 0-1.125-.504-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125h.375" />
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
