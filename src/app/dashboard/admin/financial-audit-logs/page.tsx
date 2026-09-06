import { Suspense } from "react";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/authorization";
import { getFinancialAuditLogsAction, type FinancialAuditFilters } from "@/lib/financial-audit/actions";
import FinancialAuditLogsClient from "./FinancialAuditLogsClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
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
      <PageContainer>
        <PageHeader title="Audit Logs" description="Log keuangan dan aktivitas sistem" />
        <div className="mt-6 rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{result.error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Audit Logs" description="Log keuangan dan aktivitas sistem" />
      <div className="mt-6">
        <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
          <FinancialAuditLogsClient initialLogs={result.logs} initialPage={result.page} initialPageSize={result.pageSize} initialFilters={filters} />
        </Suspense>
      </div>
    </PageContainer>
  );
}
