import { Suspense } from "react";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/authorization";
import { getFinancialAuditLogsAction, type FinancialAuditFilters } from "@/lib/financial-audit/actions";
import FinancialAuditLogsClient from "./FinancialAuditLogsClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default async function FinancialAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ actionType?: string; entityType?: string; startDate?: string; endDate?: string; page?: string }>;
}) {
  const profile = await requireAuthenticatedUser();
  requireRole(profile, ["admin", "bendahara"]);

  const params = await searchParams;
  const filters: FinancialAuditFilters = {
    actionType: (params.actionType || "all") as FinancialAuditFilters["actionType"],
    entityType: (params.entityType || "all") as FinancialAuditFilters["entityType"],
    startDate: params.startDate || "",
    endDate: params.endDate || "",
    page: params.page ? Number(params.page) : 1,
    pageSize: 20,
  };

  const result = await getFinancialAuditLogsAction(filters);

  if ("error" in result) {
    return (
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">Log Keuangan & Audit</h1>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">Audit trail transaksi keuangan dan aktivitas sistem</p>
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
      <div className="max-w-[1600px] mx-auto space-y-6">
        <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
          <FinancialAuditLogsClient initialLogs={result.logs} initialPage={result.page} initialPageSize={result.pageSize} initialFilters={filters} />
        </Suspense>
      </div>
    </PageContainer>
  );
}