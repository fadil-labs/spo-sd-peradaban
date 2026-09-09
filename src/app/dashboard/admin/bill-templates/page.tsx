"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getBillTemplatesAction, createBillTemplateAction, updateBillTemplateAction, deleteBillTemplateAction } from "./actions";
import { Pencil, Trash2 } from "lucide-react";

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
      return template.classes.name;
    }
    return "Semua";
  };

  const columns = [
    {
      key: "category",
      header: "Kategori",
      render: (item: BillTemplate) => item.payment_categories?.name || "-",
    },
    {
      key: "target",
      header: "Target",
      render: (item: BillTemplate) => getTargetLabel(item),
    },
    {
      key: "amount",
      header: "Jumlah",
      render: (item: BillTemplate) => formatCurrency(item.amount),
    },
    {
      key: "recurring",
      header: "Berulang",
      render: (item: BillTemplate) => (
        item.is_recurring ? <span className="text-xs text-primary">Ya</span> : <span className="text-xs text-muted">Tidak</span>
      ),
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
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-danger text-danger text-xs font-semibold hover:bg-danger/10 transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Templat Tagihan"
          description="Buat dan kelola templat tagihan untuk siswa atau kelas"
        />

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {formState !== "list" ? (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">
              {formState === "create" ? "Buat Templat Tagihan" : "Edit Templat Tagihan"}
            </h3>
            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payment_category_id" className="block text-sm font-medium text-foreground mb-1.5">
                    Kategori Pembayaran
                  </label>
                  <select
                    id="payment_category_id"
                    value={formData.payment_category_id}
                    onChange={(e) => setFormData({ ...formData, payment_category_id: e.target.value })}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-1.5">
                    Jumlah (Rp)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="100000"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label htmlFor="class_id" className="block text-sm font-medium text-foreground mb-1.5">
                    Kelas (Opsional)
                  </label>
                  <select
                    id="class_id"
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value, student_id: "" })}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isSubmitting || !!formData.student_id}
                  >
                    <option value="">Pilih kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="student_id" className="block text-sm font-medium text-foreground mb-1.5">
                    Siswa (Opsional)
                  </label>
                  <select
                    id="student_id"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value, class_id: "" })}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={isSubmitting || !!formData.class_id}
                  >
                    <option value="">Pilih siswa</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.nis} - {s.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Deskripsi tagihan..."
                  rows={3}
                  disabled={isSubmitting}
                />
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
                <label htmlFor="is_recurring" className="text-sm font-medium text-foreground">
                  Tagihan berulang
                </label>
              </div>
              {submitError && (
                <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
                  <p className="text-sm text-danger">{submitError}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all min-h-[44px]"
                >
                  {isSubmitting ? "Menyimpan..." : (formState === "create" ? "Buat Templat" : "Simpan Perubahan")}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setFormState("list"); setEditingId(null); }}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-all min-h-[44px]"
                >
                  Batal
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => { resetForm(); setFormState("create"); }}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all min-h-[44px]"
            >
              Buat Templat Baru
            </button>
          </div>
        )}

        {formState === "list" && (
          <Card>
            <DataTable
              data={templates}
              columns={columns}
              keyExtractor={(item) => item.id}
              isLoading={isLoading}
              emptyState={
                <div className="text-center py-8">
                  <p className="text-sm text-muted">Belum ada templat tagihan.</p>
                </div>
              }
            />
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
