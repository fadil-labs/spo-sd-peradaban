import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
// PERBAIKAN: Mengarah langsung ke file actions pembayaran yang benar
import { getParentBillDetailAction } from "@/app/dashboard/orang-tua/payments/actions";
import ParentBillDetailClient from "./ParentBillDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ParentBillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getParentBillDetailAction(id);

  if ("error" in result || !result.bill) {
    return (
      <div className="w-full max-w-3xl p-6">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-600 font-bold">
            {"error" in result ? result.error : "Tagihan tidak ditemukan."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <ParentBillDetailClient bill={result.bill} payments={result.payments} />
    </Suspense>
  );
}