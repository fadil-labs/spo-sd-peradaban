import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getParentBillDetailAction, processParentPaymentAction } from "../../actions";
import ParentBillDetailClient from "./ParentBillDetailClient";

export default async function ParentBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getParentBillDetailAction(id);

  if ("error" in result || !result.bill) {
    return (
      <div className="w-full max-w-3xl">
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{"error" in result ? result.error : "Tagihan tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  return (
      <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <ParentBillDetailClient bill={result.bill} payments={result.payments} processPaymentAction={processParentPaymentAction} />
    </Suspense>
  );
}
