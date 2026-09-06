import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getPaymentProofsAction, reviewPaymentProofAction } from "./actions";
import PaymentProofsClient from "./PaymentProofsClient";

export default async function PaymentProofsPage({ searchParams }: { searchParams: { status?: string } }) {
  const result = await getPaymentProofsAction(searchParams?.status);

  if ("error" in result) {
    return (
      <PageContainer>
        <PageHeader title="Bukti Pembayaran" description="Kelola dan verifikasi bukti pembayaran siswa" />
        <div className="mt-6 rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{result.error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Bukti Pembayaran" description="Kelola dan verifikasi bukti pembayaran siswa" />
      <div className="mt-6">
        <Suspense fallback={<TableSkeleton rows={5} columns={7} />}>
          <PaymentProofsClient proofs={result.proofs} reviewAction={reviewPaymentProofAction} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
