import { Suspense } from "react";
import { getFinancialSummaryAction, getFinancialTransactionsAction, getFinancialReportFiltersAction, FinancialReportFilters, FinancialSummary, TransactionRow } from "./actions";
import FinancialReportsClient from "./FinancialReportsClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default async function FinancialReportsPage({ searchParams }: { searchParams: Promise<FinancialReportFilters> }) {
  const resolvedSearchParams = await searchParams;
  const [summaryResult, transactionsResult, filtersResult] = await Promise.all([
    getFinancialSummaryAction(resolvedSearchParams),
    getFinancialTransactionsAction(resolvedSearchParams),
    getFinancialReportFiltersAction(),
  ]);

  if ("error" in summaryResult) {
    return (
      <PageContainer>
        <PageHeader title="Laporan Keuangan" description="Rekonsiliasi dan laporan" />
        <div className="mt-6 rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{summaryResult.error}</p>
        </div>
      </PageContainer>
    );
  }

  if ("error" in transactionsResult) {
    return (
      <PageContainer>
        <PageHeader title="Laporan Keuangan" description="Rekonsiliasi dan laporan" />
        <div className="mt-6 rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{transactionsResult.error}</p>
        </div>
      </PageContainer>
    );
  }

  const summaryData = summaryResult as {
    summary: FinancialSummary;
    billAmountByStatus: Record<string, { count: number; amount: number }>;
    totalBillAmount: number;
    totalPaid: number;
    totalOutstanding: number;
  };

  const transactionsData = transactionsResult as {
    rows: TransactionRow[];
    page: number;
    pageSize: number;
    totalRows: number;
  };

  return (
    <PageContainer>
      <PageHeader title="Laporan Keuangan" description="Rekonsiliasi dan laporan" />
      <div className="mt-6">
        <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
          <FinancialReportsClient
            summary={{ ...summaryData.summary, billAmountByStatus: summaryData.billAmountByStatus, totalBillAmount: summaryData.totalBillAmount, totalPaid: summaryData.totalPaid, totalOutstanding: summaryData.totalOutstanding }}
            transactions={transactionsData}
            filters={filtersResult}
            initialFilters={resolvedSearchParams}
          />
        </Suspense>
      </div>
    </PageContainer>
  );
}
