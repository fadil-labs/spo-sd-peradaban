import { getParentPaymentHistoryAction, type ParentPaymentHistoryFilters } from "./actions";
import PaymentHistoryClient from "./PaymentHistoryClient";

export default async function ParentPaymentsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{
    status?: string;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    page?: string;
    pageSize?: string;
  }> 
}) {
  const resolvedSearchParams = await searchParams;

  const filters: ParentPaymentHistoryFilters = {
    status: resolvedSearchParams?.status || "all",
    startDate: resolvedSearchParams?.startDate || "",
    endDate: resolvedSearchParams?.endDate || "",
    searchQuery: resolvedSearchParams?.searchQuery || "",
    page: resolvedSearchParams?.page ? parseInt(resolvedSearchParams.page, 10) : 1,
    pageSize: resolvedSearchParams?.pageSize ? parseInt(resolvedSearchParams.pageSize, 10) : 20,
  };

  const result = await getParentPaymentHistoryAction(filters);

  if ("error" in result) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <div className="rounded-md border border-red-500/20 bg-red-500/15 px-4 py-3">
          <p className="text-sm text-red-600 font-medium">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <PaymentHistoryClient
      payments={result.payments}
      page={result.page}
      pageSize={result.pageSize}
      totalRows={result.totalRows}
      initialFilters={filters}
    />
  );
}