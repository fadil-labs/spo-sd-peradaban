import { Suspense } from "react";
import { getFinancialSummaryAction, getFinancialTransactionsAction, getFinancialReportFiltersAction, FinancialReportFilters, FinancialSummary, TransactionRow } from "./actions";
import FinancialReportsClient from "./FinancialReportsClient";
import { PageContainer } from "@/components/layout/PageContainer";
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
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Laporan Keuangan</h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">Rekonsiliasi dan laporan</p>
          </div>
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{summaryResult.error}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if ("error" in transactionsResult) {
    return (
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Laporan Keuangan</h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">Rekonsiliasi dan laporan</p>
          </div>
          <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
            <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">{transactionsResult.error}</p>
          </div>
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
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="max-w-[1600px] mx-auto space-y-6">
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