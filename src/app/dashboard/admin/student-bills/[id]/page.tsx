import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getBillDetailAction } from "../actions";
import BillDetailClient from "./BillDetailClient";

export default async function StudentBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getBillDetailAction(id);

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
      <BillDetailClient bill={result.bill} payments={result.payments} />
    </Suspense>
  );
}
