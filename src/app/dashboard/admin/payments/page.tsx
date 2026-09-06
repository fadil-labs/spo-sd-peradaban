import { getAdminPaymentsAction, type PaymentMonitorFilters } from "./actions";
import PaymentsClient from "./PaymentsClient";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: PaymentMonitorFilters }) {
  const result = await getAdminPaymentsAction(searchParams);

  if ("error" in result) {
    return (
      <div className="w-full max-w-7xl">
        <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <PaymentsClient
      payments={result.payments}
      page={result.page}
      pageSize={result.pageSize}
      totalRows={result.totalRows}
      initialFilters={searchParams}
    />
  );
}
