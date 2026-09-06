import { PageContainer } from "@/components/layout/PageContainer";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AttentionSection } from "@/components/dashboard/AttentionSection";
import { DashboardError } from "@/components/dashboard/DashboardError";
import { getQuickActions } from "@/components/dashboard/navigation";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/authorization";
import { getBendaharaDashboardSummaryAction, type BendaharaDashboardResult } from "./actions";
import { FadeIn } from "@/components/animations";
import { LineChart } from "@/components/dashboard/LineChart";
import { DonutChart } from "@/components/dashboard/DonutChart";

export default async function BendaharaDashboard() {
  const profile = await requireAuthenticatedUser();
  requireRole(profile, ["bendahara"]);

  const summaryResult = await getBendaharaDashboardSummaryAction() as BendaharaDashboardResult;
  const quickActions = getQuickActions(profile.role);

  if ("error" in summaryResult) {
    const errorMessage = summaryResult.error;
    return (
      <PageContainer>
        <FadeIn>
          <DashboardHeader fullName={profile.full_name} role={profile.role} />
          <div className="mt-6">
            <DashboardError message={errorMessage} />
          </div>
        </FadeIn>
      </PageContainer>
    );
  }

  const summary = summaryResult.summary;

  const attentionItems = [
    ...(summary.pendingProofCount > 0
      ? [
          {
            label: "Bukti pembayaran menunggu verifikasi",
            count: summary.pendingProofCount,
            href: "/dashboard/admin/payment-proofs",
            tone: "warning" as const,
          },
        ]
      : []),
    ...(summary.pendingPaymentCount > 0
      ? [
          {
            label: "Pembayaran pending perlu diperiksa",
            count: summary.pendingPaymentCount,
            href: "/dashboard/admin/payments",
            tone: "info" as const,
          },
        ]
      : []),
  ];

  return (
    <PageContainer>
      <FadeIn>
        <div className="flex flex-col gap-4">
          <DashboardHeader fullName={profile.full_name} role={profile.role} />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <FadeIn delay={0} className="h-full">
              <StatCard
                title="Total Tagihan"
                value={formatCurrency(summary.totalBillAmount ?? 0)}
                subtitle={`${summary.totalBills ?? 0} tagihan`}
                icon="Receipt"
                colorVariant="blue"
              />
            </FadeIn>
            <FadeIn delay={0.1} className="h-full">
              <StatCard
                title="Outstanding"
                value={formatCurrency(summary.totalOutstanding)}
                subtitle="Sisa tagihan"
                icon="CreditCard"
                colorVariant="yellow"
              />
            </FadeIn>
            <FadeIn delay={0.2} className="h-full">
              <StatCard
                title="Pembayaran Pending"
                value={summary.pendingPaymentCount.toString()}
                subtitle={formatCurrency(summary.pendingPaymentAmount)}
                icon="BarChart3"
                colorVariant="green"
              />
            </FadeIn>
            <FadeIn delay={0.3} className="h-full">
              <StatCard
                accent
                title="Menunggu Verifikasi"
                value={summary.pendingProofCount.toString()}
                subtitle="Bukti pembayaran"
                icon="FileCheck"
                colorVariant="teal"
              />
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="xl:col-span-2 space-y-3">
              <FadeIn delay={0.4} className="h-full">
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Tren Pemasukan Bulanan</h3>
                      <p className="text-xs text-muted mt-1">6 bulan terakhir</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium text-muted">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span>Ttoton</span>
                    </div>
                  </div>
                  <LineChart data={summary.monthlyPayments} />
                </div>
              </FadeIn>
            </div>
            <div className="space-y-3">
              <FadeIn delay={0.5} className="h-full">
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="text-base font-semibold text-foreground mb-1">Komposisi Pembayaran</h3>
                  <p className="text-xs text-muted mb-4">Berdasarkan metode pembayaran</p>
                  <DonutChart data={summary.paymentComposition} />
                </div>
              </FadeIn>
              <FadeIn delay={0.6} className="h-full">
                <AttentionSection title="Perlu Perhatian" items={attentionItems} />
              </FadeIn>
              <FadeIn delay={0.7} className="h-full">
                <QuickActions title="Quick Actions" actions={quickActions} />
              </FadeIn>
            </div>
          </div>
        </div>
      </FadeIn>
    </PageContainer>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}
