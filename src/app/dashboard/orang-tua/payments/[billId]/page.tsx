import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getParentBillDetailAction, createParentPaymentIntentAction, getParentPaymentGatewayTransactionAction, simulateParentWebhookAction } from "../../actions";
import PaymentCheckoutClient from "./PaymentCheckoutClient";

export default async function ParentPaymentCheckoutPage({ params }: { params: Promise<{ billId: string }> }) {
  const { billId } = await params;
  const billResult = await getParentBillDetailAction(billId);

  if ("error" in billResult || !billResult.bill) {
    return (
      <div className="w-full max-w-3xl">
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{"error" in billResult ? billResult.error : "Tagihan tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  return (
      <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <PaymentCheckoutClient
        bill={billResult.bill}
        payments={billResult.payments}
        createPaymentIntentAction={createParentPaymentIntentAction}
        getGatewayTransactionAction={getParentPaymentGatewayTransactionAction}
        simulateWebhookAction={simulateParentWebhookAction}
      />
    </Suspense>
  );
}
