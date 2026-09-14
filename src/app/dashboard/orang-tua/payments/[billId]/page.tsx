import { Suspense } from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { 
  getParentBillDetailAction, 
  createParentPaymentIntentAction, 
  getParentPaymentGatewayTransactionAction, 
  simulateParentWebhookAction 
} from "@/app/dashboard/orang-tua/payments/actions";
import PaymentCheckoutClient from "./PaymentCheckoutClient";

type PageProps = {
  params: Promise<{ billId: string }>;
};

export default async function ParentPaymentCheckoutPage({ params }: PageProps) {
  const { billId } = await params;
  const billResult = await getParentBillDetailAction(billId);

  if ("error" in billResult || !billResult.bill) {
    return (
      <div className="w-full max-w-3xl p-6">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-600 font-bold">
            {"error" in billResult ? billResult.error : "Tagihan tidak ditemukan."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
      <PaymentCheckoutClient
        bill={billResult.bill}
        payments={billResult.payments}
        createPaymentIntentAction={createParentPaymentIntentAction as any}
        getGatewayTransactionAction={getParentPaymentGatewayTransactionAction as any}
        simulateWebhookAction={simulateParentWebhookAction as any}
      />
    </Suspense>
  );
}