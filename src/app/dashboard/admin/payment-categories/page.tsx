"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { getPaymentCategoriesAction, createPaymentCategoryAction, updatePaymentCategoryAction, deletePaymentCategoryAction } from "./actions";
import { Pencil, Trash2 } from "lucide-react";

type PaymentCategory = {
  id: string;
  name: string;
  description: string | null;
  allow_installments: boolean;
  minimum_installment_amount: number | null;
  require_installment_schedule: boolean;
};

type FormState = "list" | "create" | "edit";

export default function PaymentCategoriesPage() {
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    allow_installments: false,
    minimum_installment_amount: "",
    require_installment_schedule: false,
  });

  const toast = useToast();

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getPaymentCategoriesAction();
    if ("error" in result) {
      setError(result.error as string);
    } else {
      setCategories(result.categories);
    }
    setIsLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      allow_installments: false,
      minimum_installment_amount: "",
      require_installment_schedule: false,
    });
    setSubmitError(null);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("description", formData.description);
    formDataObj.append("allow_installments", String(formData.allow_installments));
    formDataObj.append("minimum_installment_amount", formData.minimum_installment_amount);
    formDataObj.append("require_installment_schedule", String(formData.require_installment_schedule));

    const result = await createPaymentCategoryAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Kategori berhasil dibuat.");
      resetForm();
      setFormState("list");
      loadCategories();
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
    formDataObj.append("name", formData.name);
    formDataObj.append("description", formData.description);
    formDataObj.append("allow_installments", String(formData.allow_installments));
    formDataObj.append("minimum_installment_amount", formData.minimum_installment_amount);
    formDataObj.append("require_installment_schedule", String(formData.require_installment_schedule));

    const result = await updatePaymentCategoryAction(formDataObj);
    if (result?.error) {
      setSubmitError(result.error);
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Kategori berhasil diperbarui.");
      resetForm();
      setFormState("list");
      setEditingId(null);
      loadCategories();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deletePaymentCategoryAction(id);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Kategori berhasil dihapus.");
      loadCategories();
    }
  };

  const startEdit = (category: PaymentCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
      allow_installments: category.allow_installments,
      minimum_installment_amount: category.minimum_installment_amount?.toString() || "",
      require_installment_schedule: category.require_installment_schedule,
    });
    setFormState("edit");
  };

  const formatCurrency = (value: number | null) =>
    value ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value) : "-";

  const columns = [
    {
      key: "name",
      header: "Kategori",
      sortable: true,
      render: (item: PaymentCategory) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          {item.description && <p className="text-xs text-muted mt-0.5">{item.description}</p>}
        </div>
      ),
    },
    {
      key: "installments",
      header: "Cicilan",
      render: (item: PaymentCategory) => (
        <div className="flex items-center gap-2">
          {item.allow_installments ? (
            <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Cicilan</span>
          ) : (
            <span className="text-xs text-muted">Tidak</span>
          )}
          {item.minimum_installment_amount && (
            <span className="text-xs text-muted">Min. {formatCurrency(item.minimum_installment_amount)}</span>
          )}
        </div>
      ),
      mobileHide: true,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (item: PaymentCategory) => (
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
          title="Kategori Pembayaran"
          description="Kelola kategori pembayaran dan aturan cicilan"
          primaryAction={
            formState === "list"
              ? { label: "Tambah Kategori", onClick: () => { resetForm(); setFormState("create"); } }
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
              {formState === "create" ? "Tambah Kategori Pembayaran" : "Edit Kategori Pembayaran"}
            </h3>
            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div>
                 <label htmlFor="name" className="block text-xs text-muted mb-1.5">
                  Nama Kategori
                </label>
                 <input
                   id="name"
                   type="text"
                   value={formData.name}
                   onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                   className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                   placeholder="Contoh: SPP"
                   required
                   disabled={isSubmitting}
                 />
              </div>

              <div>
                 <label htmlFor="description" className="block text-xs text-muted mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={2}
                  maxLength={500}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="allow_installments"
                  type="checkbox"
                  checked={formData.allow_installments}
                  onChange={(e) => setFormData({ ...formData, allow_installments: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <label htmlFor="allow_installments" className="text-sm text-foreground">
                  Izinkan pembayaran cicilan
                </label>
              </div>

              {formData.allow_installments && (
                <>
                  <div>
                     <label htmlFor="minimum_installment_amount" className="block text-xs text-muted mb-1.5">
                      Jumlah Cicilan Minimum
                    </label>
                     <input
                       id="minimum_installment_amount"
                       type="number"
                       value={formData.minimum_installment_amount}
                       onChange={(e) => setFormData({ ...formData, minimum_installment_amount: e.target.value })}
                       className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                       placeholder="0"
                       min="0"
                       step="1000"
                       required={formData.allow_installments}
                       disabled={isSubmitting}
                     />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="require_installment_schedule"
                      type="checkbox"
                      checked={formData.require_installment_schedule}
                      onChange={(e) => setFormData({ ...formData, require_installment_schedule: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="require_installment_schedule" className="text-sm text-foreground">
                      Wajibkan jadwal cicilan
                    </label>
                  </div>
                </>
              )}

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
              <TableSkeleton rows={5} columns={3} />
            ) : (
              <DataTable
                columns={columns}
                data={categories}
                keyExtractor={(item) => item.id}
                emptyTitle="Belum ada kategori pembayaran"
                emptyDescription="Buat kategori pembayaran pertama."
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
