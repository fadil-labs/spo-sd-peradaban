import { getAdminPaymentsAction, type PaymentMonitorFilters } from "./actions";
import PaymentsClient from "./PaymentsClient";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<PaymentMonitorFilters>;
}) {
  const resolvedSearchParams = await searchParams;
  const result = await getAdminPaymentsAction(resolvedSearchParams);

  if ("error" in result) {
    return (
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-4 sm:p-6 text-[#1A1A1A]">
        <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4 max-w-7xl mx-auto">
          <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{result.error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PaymentsClient
      payments={result.payments}
      page={result.page}
      pageSize={result.pageSize}
      totalRows={result.totalRows}
      initialFilters={resolvedSearchParams}
    />
  );
}