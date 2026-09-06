import { getParentPaymentHistoryAction, type ParentPaymentHistoryFilters } from "./actions";
import PaymentHistoryClient from "./PaymentHistoryClient";

export default async function ParentPaymentsPage({ searchParams }: { searchParams: ParentPaymentHistoryFilters }) {
  const result = await getParentPaymentHistoryAction(searchParams);

  if ("error" in result) {
    return (
      <div className="w-full max-w-5xl">
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{result.error}</p>
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
      initialFilters={searchParams}
    />
  );
}
