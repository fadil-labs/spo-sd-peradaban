"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { setupInstallmentPlanAction, removeInstallmentPlanAction } from "@/app/dashboard/admin/student-bills/actions";

type InstallmentPlanInput = {
  total_installments: number;
  installment_amount: number;
  due_dates: string[];
  paid_installments?: number[];
};

type InstallmentPlanSetupProps = {
  billId: string;
  billAmount: number;
  existingPlan: InstallmentPlanInput | null;
  onSuccess?: () => void;
};

export function InstallmentPlanSetup({ billId, billAmount, existingPlan, onSuccess }: InstallmentPlanSetupProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(existingPlan?.total_installments || 3);
  const [installmentAmount, setInstallmentAmount] = useState(existingPlan?.installment_amount || Math.ceil(billAmount / 3));
  const [dueDates, setDueDates] = useState<string[]>(existingPlan?.due_dates || Array(3).fill(""));
  const [paidInstallments, setPaidInstallments] = useState<number[]>(existingPlan?.paid_installments || []);

  useEffect(() => {
    const dates = Array.from({ length: totalInstallments }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      return dueDates[i] || d.toISOString().split("T")[0];
    });
    setDueDates(dates);
  }, [totalInstallments]);

  const handleTotalInstallmentsChange = (value: number) => {
    setTotalInstallments(value);
    const dates = Array.from({ length: value }, (_, i) => dueDates[i] || "");
    setDueDates(dates);
  };

  const handleDueDateChange = (index: number, value: string) => {
    const newDates = [...dueDates];
    newDates[index] = value;
    setDueDates(newDates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (dueDates.some(d => !d)) {
      toast.addToast("error", "Semua tanggal jatuh tempo harus diisi.");
      setIsSubmitting(false);
      return;
    }

    const result = await setupInstallmentPlanAction(billId, {
      total_installments: totalInstallments,
      installment_amount: installmentAmount,
      due_dates: dueDates,
      paid_installments: paidInstallments,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Rencana cicilan berhasil disimpan.");
      onSuccess?.();
    }
  };

  const handleRemove = async () => {
    setIsSubmitting(true);
    const result = await removeInstallmentPlanAction(billId);
    setIsSubmitting(false);

    if (result.error) {
      toast.addToast("error", result.error);
    } else {
      toast.addToast("success", "Rencana cicilan berhasil dihapus.");
      onSuccess?.();
    }
  };

  return (
    <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-3">
        <h3 className="text-base font-bold text-[#1A1A1A]">
          {existingPlan ? "Ubah Rencana Cicilan" : "Buat Rencana Cicilan"}
        </h3>
        {existingPlan && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isSubmitting}
            className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Hapus
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#555] mb-1">
              Jumlah Cicilan
            </label>
            <input
              type="number"
              min={2}
              max={12}
              value={totalInstallments}
              onChange={(e) => handleTotalInstallmentsChange(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
              disabled={isSubmitting || !!existingPlan}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#555] mb-1">
              Nominal per Cicilan (Rp)
            </label>
            <input
              type="number"
              min={1}
              value={installmentAmount}
              onChange={(e) => setInstallmentAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
              disabled={isSubmitting || !!existingPlan}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#555]">Tanggal Jatuh Tempo</label>
          {dueDates.map((date, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#7A7A7A] w-24">Cicilan {index + 1}</span>
              <input
                type="date"
                value={date}
                onChange={(e) => handleDueDateChange(index, e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl text-xs text-[#1A1A1A]"
                disabled={isSubmitting || !!existingPlan}
              />
              {existingPlan && paidInstallments.includes(index + 1) && (
                <span className="px-2 py-1 bg-[#0C3B2E]/10 text-[#0C3B2E] text-[10px] font-bold rounded">LUNAS</span>
              )}
            </div>
          ))}
        </div>

        {!existingPlan && (
          <div className="flex items-center gap-2 pt-2">
            <input
              id="already_paid"
              type="checkbox"
              checked={paidInstallments.length > 0}
              onChange={(e) => setPaidInstallments(e.target.checked ? [1] : [])}
              className="h-4 w-4 rounded border-[#E5E0D8] text-[#0C3B2E] focus:ring-[#0C3B2E]"
              disabled={isSubmitting}
            />
            <label htmlFor="already_paid" className="text-xs font-bold text-[#555]">
              Cicilan 1 sudah dibayar sebelumnya
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {existingPlan && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-bold text-red-600 hover:bg-red-500/20 disabled:opacity-50"
            >
              Hapus Rencana
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl bg-[#0C3B2E] text-white text-xs font-extrabold hover:bg-[#10523E] disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : existingPlan ? "Perbarui Rencana" : "Buat Rencana Cicilan"}
          </button>
        </div>
      </form>
    </div>
  );
}
