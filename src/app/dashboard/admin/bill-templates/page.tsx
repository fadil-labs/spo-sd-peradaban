"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import {
  getBillTemplatesAction,
  createBillTemplateAction,
  updateBillTemplateAction,
  deleteBillTemplateAction,
} from "./actions";
import { Pencil, Trash2, PlusCircle, X, ScrollText } from "lucide-react";

type BillTemplate = {
  id: string;
  payment_category_id: string;
  class_id: string | null;
  student_id: string | null;
  amount: number;
  description: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
  payment_categories: { id: string; name: string } | null;
  classes: { id: string; name: string } | null;
  students: { id: string; nis: string; full_name: string } | null;
};

type FormState = "list" | "create" | "edit";

export default function BillTemplatesPage() {
  const [templates, setTemplates] = useState<BillTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    payment_category_id: "",
    class_id: "",
    student_id: "",
    amount: "",
    description: "",
    is_recurring: false,
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; nis: string; full_name: string }[]>([]);

  const toast = useToast();

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getBillTemplatesAction();
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setTemplates(result.templates);
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

    const [{ data: categoriesData }, { data: classesData }, { data: studentsData }] = await Promise.all([
      supabase.from("payment_categories").select("id, name").eq("school_id", profile.school_id).order("name"),
      supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name"),
      supabase.from("students").select("id, nis, full_name").eq("school_id", profile.school_id).order("full_name"),
    ]);

    setCategories(categoriesData || []);
    setClasses(classesData || []);
    setStudents(studentsData || []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadTemplates();
    loadLookups();
  }, [loadTemplates, loadLookups]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData({
      payment_category_id: "",
      class_id: "",
      student_id: "",
      amount: "",
      description: "",
      is_recurring: false,
    });
    setSubmitError(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("payment_category_id", formData.payment_category_id);
    formDataObj.append("class_id", formData.class_id);
    formDataObj.append("student_id", formData.student_id);
    formDataObj.append("amount", formData.amount);
    formDataObj.append("description", formData.description);
    formDataObj.append("is_recurring", String(formData.is_recurring));

    const result = await createBillTemplateAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Templat tagihan berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadTemplates();
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
    formDataObj.append("payment_category_id", formData.payment_category_id);
    formDataObj.append("class_id", formData.class_id);
    formDataObj.append("student_id", formData.student_id);
    formDataObj.append("amount", formData.amount);
    formDataObj.append("description", formData.description);
    formDataObj.append("is_recurring", String(formData.is_recurring));

    const result = await updateBillTemplateAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Templat tagihan berhasil diperbarui.");
      resetForm();
      setFormState("list");
      setEditingId(null);
      loadTemplates();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus templat tagihan ini?")) return;
    const result = await deleteBillTemplateAction(id);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Templat tagihan berhasil dihapus.");
      loadTemplates();
    }
  };

  const startEdit = (template: BillTemplate) => {
    setEditingId(template.id);
    setFormData({
      payment_category_id: template.payment_category_id,
      class_id: template.class_id || "",
      student_id: template.student_id || "",
      amount: template.amount.toString(),
      description: template.description || "",
      is_recurring: template.is_recurring,
    });
    setFormState("edit");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const getTargetLabel = (template: BillTemplate) => {
    if (template.students) {
      return `${template.students.nis} - ${template.students.full_name}`;
    }
    if (template.classes) {
      return `Kelas: ${template.classes.name}`;
    }
    return "Semua Siswa (Umum)";
  };

  const columns = [
    {
      key: "category",
      header: "Kategori Pembayaran",
      render: (item: BillTemplate) => (
        <div>
          <p className="font-bold text-[#1A1A1A] text-xs sm:text-sm">{item.payment_categories?.name || "-"}</p>
          {item.description && (
            <p className="text-[11px] text-[#7A7A7A] mt-0.5 line-clamp-1">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "target",
      header: "Target Sasaran",
      render: (item: BillTemplate) => (
        <span className="text-xs font-semibold text-[#4A4A4A]">{getTargetLabel(item)}</span>
      ),
    },
    {
      key: "amount",
      header: "Nominal",
      render: (item: BillTemplate) => (
        <span className="font-extrabold text-xs sm:text-sm text-[#0C3B2E]">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: "recurring",
      header: "Berulang",
      render: (item: BillTemplate) =>
        item.is_recurring ? (
          <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Berulang (Recurring)
          </span>
        ) : (
          <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#7A7A7A]/10 text-[#7A7A7A]">
            Sekali (One-off)
          </span>
        ),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: BillTemplate) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => startEdit(item)}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5 text-[#0C3B2E]" />
            Edit
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-[#A83A32]/10 border border-[#A83A32]/30 text-[#A83A32] text-xs font-semibold rounded-xl hover:bg-[#A83A32] hover:text-white transition-colors inline-flex items-center gap-1.5"
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
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
              Templat Tagihan Otomatis
            </h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
              Buat templat tagihan berkala untuk mempermudah penerbitan tagihan massal per kelas atau siswa.
            </p>
          </div>

          <div>
            {formState === "list" ? (
              <button
                onClick={() => {
                  resetForm();
                  setFormState("create");
                }}
                className="px-4 py-2.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm inline-flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Buat Templat Baru</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  resetForm();
                  setFormState("list");
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-[#1A1A1A] text-xs font-bold rounded-xl hover:bg-[#EAE6DC] transition-colors inline-flex items-center gap-1.5"
              >
                <X className="h-4 w-4" />
                <span>Batal</span>
              </button>
            )}
          </div>
        </div>

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

        {/* FORM CREATE / EDIT */}
        {(formState === "create" || formState === "edit") && (
          <div className="bg-white p-5 sm:p-6 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
            <h3 className="text-base font-bold text-[#1A1A1A]">
              {formState === "create" ? "Buat Templat Tagihan Baru" : "Edit Templat Tagihan"}
            </h3>

            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payment_category_id" className="block text-xs font-bold text-[#555] mb-1.5">
                    Kategori Pembayaran
                  </label>
                  <select
                    id="payment_category_id"
                    value={formData.payment_category_id}
                    onChange={(e) => setFormData({ ...formData, payment_category_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-xs font-bold text-[#555] mb-1.5">
                    Nominal Tagihan (Rp)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Contoh: 250000"
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="class_id" className="block text-xs font-bold text-[#555] mb-1.5">
                    Target Kelas (Opsional)
                  </label>
                  <select
                    id="class_id"
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value, student_id: "" })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    disabled={isSubmitting || !!formData.student_id}
                  >
                    <option value="">Semua / Tidak Spesifik Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="student_id" className="block text-xs font-bold text-[#555] mb-1.5">
                    Target Siswa Perorangan (Opsional)
                  </label>
                  <select
                    id="student_id"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value, class_id: "" })}
                    className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                    disabled={isSubmitting || !!formData.class_id}
                  >
                    <option value="">Semua / Tidak Spesifik Siswa</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.nis} - {s.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-bold text-[#555] mb-1.5">
                  Deskripsi / Keterangan Templat
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan opsional untuk templat ini..."
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-2 p-3.5 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <input
                  id="is_recurring"
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E5E0D8] text-[#0C3B2E] focus:ring-[#0C3B2E]"
                  disabled={isSubmitting}
                />
                <label htmlFor="is_recurring" className="text-xs font-bold text-[#1A1A1A]">
                  Tandai sebagai Tagihan Berulang (Recurring Billing)
                </label>
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
                  {isSubmitting ? "Menyimpan..." : formState === "create" ? "Simpan Templat" : "Simpan Perubahan"}
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
          <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            {isLoading ? (
              <TableSkeleton rows={4} columns={4} />
            ) : (
              <DataTable
                columns={columns}
                data={templates}
                keyExtractor={(item) => item.id}
                emptyTitle="Belum Ada Templat Tagihan"
                emptyDescription="Buat templat tagihan untuk memudahkan pembuatan tagihan rutin kelas atau siswa."
                emptyIcon={<ScrollText className="h-6 w-6 text-[#7A7A7A]" />}
              />
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}