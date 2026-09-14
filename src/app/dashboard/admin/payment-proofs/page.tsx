import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getPaymentProofsAction, reviewPaymentProofAction } from "./actions";
import PaymentProofsClient from "./PaymentProofsClient";

export default async function PaymentProofsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const result = await getPaymentProofsAction(searchParams?.status);

  if ("error" in result) {
    return (
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
        <div className="max-w-[1600px] mx-auto space-y-4">
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A]">Bukti Pembayaran</h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">Kelola dan verifikasi bukti pembayaran siswa</p>
          </div>
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{result.error}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="max-w-[1600px] mx-auto space-y-5 sm:space-y-6">
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
            Verifikasi Bukti Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
            Periksa dan validasi bukti transfer manual yang diunggah oleh orang tua murid.
          </p>
        </div>

        <Suspense fallback={<TableSkeleton rows={5} columns={7} />}>
          <PaymentProofsClient proofs={result.proofs} reviewAction={reviewPaymentProofAction} />
        </Suspense>
      </div>
    </PageContainer>
  );
}