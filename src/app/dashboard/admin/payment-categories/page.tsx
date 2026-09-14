"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/operational/data-table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import {
  getPaymentCategoriesAction,
  createPaymentCategoryAction,
  updatePaymentCategoryAction,
  deletePaymentCategoryAction,
} from "./actions";
import {
  Pencil,
  Trash2,
  PlusCircle,
  X,
  Search,
  Layers,
  Check,
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

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
      toast.addToast("success", "Kategori pembayaran berhasil dibuat.");
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
      toast.addToast("success", "Kategori pembayaran berhasil diperbarui.");
      resetForm();
      setFormState("list");
      setEditingId(null);
      loadCategories();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus kategori pembayaran ini?")) return;
    const result = await deletePaymentCategoryAction(id);
    if (result?.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Kategori pembayaran berhasil dihapus.");
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
    value
      ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
      : "-";

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      header: "Kategori Pembayaran",
      render: (item: PaymentCategory) => (
        <div>
          <p className="font-bold text-[#1A1A1A] text-xs sm:text-sm">{item.name}</p>
          {item.description && (
            <p className="text-[11px] text-[#7A7A7A] mt-0.5 line-clamp-1">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "installments",
      header: "Aturan Cicilan",
      render: (item: PaymentCategory) => (
        <div className="flex flex-col gap-1">
          {item.allow_installments ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
                Cicilan Diizinkan
              </span>
              {item.minimum_installment_amount && (
                <span className="text-[11px] font-semibold text-[#7A7A7A]">
                  Min: {formatCurrency(item.minimum_installment_amount)}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#7A7A7A]/10 text-[#7A7A7A]">
              Tidak Ada Cicilan
            </span>
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
              Kategori Pembayaran
            </h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
              Atur jenis tagihan sekolah (SPP, Gedung, Seragam) beserta skema cicilannya.
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
                <span>Tambah Kategori</span>
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

        {/* FORM CREATE / EDIT */}
        {(formState === "create" || formState === "edit") && (
          <div className="bg-white p-5 sm:p-6 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
            <h3 className="text-base font-bold text-[#1A1A1A]">
              {formState === "create" ? "Tambah Kategori Pembayaran Baru" : "Edit Kategori Pembayaran"}
            </h3>

            <form className="space-y-4" onSubmit={formState === "create" ? handleCreate : handleUpdate}>
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-[#555] mb-1.5">
                  Nama Kategori
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: SPP Bulanan, Uang Gedung, Seragam"
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-bold text-[#555] mb-1.5">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tuliskan keterangan mengenai alokasi atau ketentuan pembayaran ini..."
                  className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                  rows={3}
                  maxLength={500}
                  disabled={isSubmitting}
                />
              </div>

              <div className="p-4 bg-[#F5F3EC] rounded-2xl border border-[#E5E0D8] space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    id="allow_installments"
                    type="checkbox"
                    checked={formData.allow_installments}
                    onChange={(e) =>
                      setFormData({ ...formData, allow_installments: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-[#E5E0D8] text-[#0C3B2E] focus:ring-[#0C3B2E]"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="allow_installments" className="text-xs font-bold text-[#1A1A1A]">
                    Izinkan Pembayaran Dicicil (Beberapa Kali Bayar)
                  </label>
                </div>

                {formData.allow_installments && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#EAE6DC]">
                    <div>
                      <label
                        htmlFor="minimum_installment_amount"
                        className="block text-xs font-bold text-[#555] mb-1"
                      >
                        Nominal Cicilan Minimum (Rp)
                      </label>
                      <input
                        id="minimum_installment_amount"
                        type="number"
                        value={formData.minimum_installment_amount}
                        onChange={(e) =>
                          setFormData({ ...formData, minimum_installment_amount: e.target.value })
                        }
                        placeholder="Contoh: 100000"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                        min="0"
                        step="1000"
                        required={formData.allow_installments}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <input
                        id="require_installment_schedule"
                        type="checkbox"
                        checked={formData.require_installment_schedule}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            require_installment_schedule: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-[#E5E0D8] text-[#0C3B2E] focus:ring-[#0C3B2E]"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor="require_installment_schedule"
                        className="text-xs font-bold text-[#1A1A1A]"
                      >
                        Wajibkan Jadwal Cicilan Terjadwal
                      </label>
                    </div>
                  </div>
                )}
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
                  {isSubmitting ? "Menyimpan..." : "Simpan Kategori"}
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
            <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8A8A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kategori pembayaran..."
                  className="w-full pl-10 pr-4 py-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#0C3B2E]"
                />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-3 py-2 bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-bold text-[#1A1A1A] rounded-xl hover:bg-[#EAE6DC]"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              {isLoading ? (
                <TableSkeleton rows={4} columns={3} />
              ) : (
                <DataTable
                  columns={columns}
                  data={filteredCategories}
                  keyExtractor={(item) => item.id}
                  emptyTitle="Belum Ada Kategori Pembayaran"
                  emptyDescription="Buat kategori seperti SPP, Uang Gedung, atau Seragam untuk mulai menagih."
                />
              )}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}