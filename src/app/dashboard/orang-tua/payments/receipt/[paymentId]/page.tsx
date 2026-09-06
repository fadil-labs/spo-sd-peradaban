import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getParentPaymentReceiptAction } from "../../../actions";
import PaymentReceiptClient from "./PaymentReceiptClient";

export default async function ParentPaymentReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const result = await getParentPaymentReceiptAction(paymentId);

  if ("error" in result) {
    return (
      <div className="w-full max-w-3xl">
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{result.error}</p>
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
