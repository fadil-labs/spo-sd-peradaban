import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getParentPaymentReceiptAction } from "../../actions";
import PaymentReceiptClient from "./PaymentReceiptClient";

export default async function ParentPaymentReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const result = await getParentPaymentReceiptAction(paymentId);

  if ("error" in result) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12">
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-600 font-medium">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <PaymentReceiptClient receipt={result} />
    </Suspense>
  );
}