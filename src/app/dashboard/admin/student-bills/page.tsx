"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import {
  getStudentBillsAction,
  createStudentBillAction,
  generateBillsFromTemplateAction,
  getBillTemplatesForModalAction,
} from "./actions";
import {
  ExternalLink,
  Search,
  PlusCircle,
  X,
  Zap,
} from "lucide-react";

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
  payment_categories: {
    id: string;
    name: string;
    allow_installments: boolean;
    minimum_installment_amount: number | null;
  } | null;
};

type FormState = "list" | "create";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Belum Bayar" },
  { value: "partial", label: "Sebagian" },
  { value: "paid", label: "Lunas" },
  { value: "cancelled", label: "Dibatalkan" },
];

export default function StudentBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<StudentBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

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
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Template Modal States
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; amount: number; payment_categories: { name: string } | null; classes: { name: string } | null }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDueDate, setTemplateDueDate] = useState("");

  const toast = useToast();

  const loadBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getStudentBillsAction(
      searchRef.current || undefined,
      statusFilter,
      categoryFilter,
      pageRef.current,
      pageSize
    );
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setBills(result.bills);
      setTotalRows(result.totalRows);
    }
    setIsLoading(false);
  }, [statusFilter, categoryFilter, pageSize]);

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

    const [{ data: studentsData }, { data: categoriesData }, { data: enrollmentsData }] = await Promise.all([
      supabase
        .from("students")
        .select("id, nis, full_name")
        .eq("school_id", profile.school_id)
        .order("full_name"),
      supabase
        .from("payment_categories")
        .select("id, name")
        .eq("school_id", profile.school_id)
        .order("name"),
      supabase
        .from("student_enrollments")
        .select("id, student_id, classes(name), academic_year_id")
        .eq("school_id", profile.school_id),
    ]);

    setStudents(studentsData || []);
    setCategories(categoriesData || []);
    setEnrollments(
      (enrollmentsData || []).map((e: any) => ({
        id: e.id,
        student_id: e.student_id,
        name: e.classes?.name || "Kelas -",
      }))
    );
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadBills();
  }, [loadBills, page, searchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);
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
  };

  const loadTemplatesForModal = async () => {
    const result = await getBillTemplatesForModalAction();
    if ("error" in result && result.error) {
      toast.addToast("error", result.error);
      return;
    }
    setTemplates(result.templates || []);
    setShowTemplateModal(true);
  };

  const handleGenerateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    setIsSubmitting(true);

    const formDataObj = new FormData();
    formDataObj.append("template_id", selectedTemplateId);
    formDataObj.append("due_date", templateDueDate);

    const result = await generateBillsFromTemplateAction(formDataObj);
    if ("error" in result && result.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Berhasil men-generate tagihan dari templat.");
      setShowTemplateModal(false);
      setSelectedTemplateId("");
      setTemplateDueDate("");
      loadBills();
    }
    setIsSubmitting(false);
  };

  const filteredStudents = students.filter((student) => {
    return (
      studentSearchQuery.trim() === "" ||
      student.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.nis.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
  });

  const filteredEnrollments = enrollments.filter((enrollment) => {
    return formData.student_id === "" || enrollment.student_id === formData.student_id;
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
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);

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
      key: "student",
      header: "Siswa",
      render: (item: StudentBill) => (
        <div>
          <p className="font-bold text-[#1A1A1A] text-xs sm:text-sm">
            {item.students?.full_name || "-"}
          </p>
          <p className="text-[11px] text-[#7A7A7A] font-semibold">
            NIS: {item.students?.nis || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      render: (item: StudentBill) => (
        <span className="font-semibold text-xs text-[#4A4A4A]">
          {item.payment_categories?.name || "-"}
        </span>
      ),
      mobileHide: true,
    },
    {
      key: "amount",
      header: "Jumlah Tagihan",
      render: (item: StudentBill) => (
        <span className="font-extrabold text-xs sm:text-sm text-[#0C3B2E]">
          {formatCurrency(item.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item: StudentBill) => {
        const labels: Record<string, { label: string; bg: string; text: string }> = {
          paid: { label: "Lunas", bg: "bg-[#0C3B2E]/10", text: "text-[#0C3B2E]" },
          pending: { label: "Belum Bayar", bg: "bg-[#C28E38]/10", text: "text-[#C28E38]" },
          partial: { label: "Sebagian", bg: "bg-[#2563EB]/10", text: "text-[#2563EB]" },
          cancelled: { label: "Dibatalkan", bg: "bg-[#A83A32]/10", text: "text-[#A83A32]" },
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
      key: "due_date",
      header: "Jatuh Tempo",
      render: (item: StudentBill) => (
        <span className="text-xs text-[#7A7A7A]">{formatDate(item.due_date)}</span>
      ),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: StudentBill) => (
        <button
          onClick={() => router.push(`/dashboard/admin/student-bills/${item.id}`)}
          className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5"
        >
          <ExternalLink className="h-3.5 w-3.5 text-[#0C3B2E]" />
          Detail
        </button>
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
              Tagihan Siswa
            </h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
              Kelola penagihan SPP, biaya pendaftaran, dan pemantauan pembayaran siswa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {formState === "list" ? (
              <>
                <button
                  onClick={loadTemplatesForModal}
                  className="px-4 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#EAE6DC] transition-all shadow-sm inline-flex items-center gap-2"
                >
                  <Zap className="h-4 w-4 text-[#C28E38]" />
                  <span>Generate dari Templat</span>
                </button>
                <button
                  onClick={() => setFormState("create")}
                  className="px-4 py-2.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm inline-flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Buat Tagihan</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  resetForm();
                  setFormState("list");
                }}
                className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5"
              >
                <X className="h-4 w-4" />
                <span>Batal</span>
              </button>
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

        {/* MODAL GENERATE DARI TEMPLAT */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-[20px] p-6 max-w-md w-full space-y-4 border border-[#E5E0D8] shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#1A1A1A]">Generate Tagihan Massal dari Templat</h3>
                <button onClick={() => setShowTemplateModal(false)} className="p-1 rounded-lg hover:bg-[#F5F3EC]">
                  <X className="h-4 w-4 text-[#7A7A7A]" />
                </button>
              </div>

              <form onSubmit={handleGenerateFromTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#555] mb-1">Pilih Templat Tagihan</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                  >
                    <option value="">-- Pilih Templat Tersedia --</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.payment_categories?.name || "Kategori"} ({t.classes?.name || "Semua Kelas"}) - Rp {t.amount?.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#555] mb-1">Tanggal Jatuh Tempo Tagihan</label>
                  <input
                    type="date"
                    value={templateDueDate}
                    onChange={(e) => setTemplateDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#F5F3EC] text-xs font-bold rounded-xl border border-[#E5E0D8]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] disabled:opacity-50"
                  >
                    {isSubmitting ? "Memproses..." : "Generate Sekarang"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FORM BUAT TAGIHAN */}
        {formState === "create" && (
          <div className="bg-white p-5 sm:p-6 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
            <h3 className="text-base font-bold text-[#1A1A1A]">Buat Tagihan Baru</h3>

            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="student_search" className="block text-xs font-bold text-[#555]">
                    Pilih Siswa
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8A8A]" />
                    <input
                      id="student_search"
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Cari nama atau NIS siswa..."
                      className="w-full pl-9 pr-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                      disabled={isSubmitting}
                    />
                  </div>
                  <select
                    id="student_id"
                    value={formData.student_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        student_id: e.target.value,
                        student_enrollment_id: "",
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">-- Pilih Siswa --</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nis} - {s.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="student_enrollment_id" className="block text-xs font-bold text-[#555]">
                    Pendaftaran Kelas (Opsional)
                  </label>
                  <select
                    id="student_enrollment_id"
                    value={formData.student_enrollment_id}
                    onChange={(e) =>
                      setFormData({ ...formData, student_enrollment_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    disabled={isSubmitting || !formData.student_id}
                  >
                    <option value="">Tanpa Pendaftaran Spesifik</option>
                    {filteredEnrollments.map((en) => (
                      <option key={en.id} value={en.id}>
                        {en.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payment_category_id" className="block text-xs font-bold text-[#555] mb-1.5">
                    Kategori Pembayaran
                  </label>
                  <select
                    id="payment_category_id"
                    value={formData.payment_category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_category_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-xs font-bold text-[#555] mb-1.5">
                    Jumlah Tagihan (Rp)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Contoh: 500000"
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    min="1"
                    step="1000"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="is_recurring"
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E0D8] text-[#0C3B2E] focus:ring-[#0C3B2E]"
                  disabled={isSubmitting}
                />
                <label htmlFor="is_recurring" className="text-xs font-bold text-[#1A1A1A]">
                  Tagihan Berulang (SPP Bulanan)
                </label>
              </div>

              {formData.is_recurring && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                  <div>
                    <label htmlFor="billing_period_start" className="block text-xs font-bold text-[#555] mb-1">
                      Periode Mulai
                    </label>
                    <input
                      id="billing_period_start"
                      type="date"
                      value={formData.billing_period_start}
                      onChange={(e) =>
                        setFormData({ ...formData, billing_period_start: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                      required={formData.is_recurring}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="billing_period_end" className="block text-xs font-bold text-[#555] mb-1">
                      Periode Selesai
                    </label>
                    <input
                      id="billing_period_end"
                      type="date"
                      value={formData.billing_period_end}
                      onChange={(e) =>
                        setFormData({ ...formData, billing_period_end: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                      required={formData.is_recurring}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="due_date" className="block text-xs font-bold text-[#555] mb-1.5">
                  Tanggal Jatuh Tempo
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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
                  {isSubmitting ? "Menyimpan..." : "Simpan Tagihan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFormState("list");
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
                  placeholder="Cari NIS atau Nama Siswa..."
                  className="w-full pl-10 pr-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A]"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A]"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {(searchQuery || statusFilter !== "all" || categoryFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setCategoryFilter("all");
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
                <TableSkeleton rows={5} columns={6} />
              ) : (
                <DataTable
                  columns={columns}
                  data={bills}
                  keyExtractor={(item) => item.id}
                  emptyTitle="Belum Ada Tagihan"
                  emptyDescription="Buat tagihan pertama untuk siswa melalui tombol 'Buat Tagihan' atau 'Generate dari Templat' di atas."
                />
              )}

              {totalRows > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-2 border-t border-[#EAE6DC] text-xs text-[#7A7A7A]">
                  <span>
                    Menampilkan {(page - 1) * pageSize + 1} -{" "}
                    {Math.min(page * pageSize, totalRows)} dari {totalRows} tagihan
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