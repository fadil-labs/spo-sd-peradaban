import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getBillDetailAction } from "../actions";
import BillDetailClient from "./BillDetailClient";

export default async function StudentBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getBillDetailAction(id);

  if ("error" in result || !result.bill) {
    return (
      <div className="w-full max-w-3xl p-6">
        <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
          <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">
            {"error" in result ? result.error : "Tagihan tidak ditemukan."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <BillDetailClient
        bill={result.bill}
        payments={result.payments}
        paymentMethods={result.paymentMethods || []}
        schoolPaymentMethods={result.schoolPaymentMethods || []}
      />
    </Suspense>
  );
}