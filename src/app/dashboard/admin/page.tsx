import { PageContainer } from "@/components/layout/PageContainer";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AttentionSection } from "@/components/dashboard/AttentionSection";
import { DashboardError } from "@/components/dashboard/DashboardError";
import { getQuickActions } from "@/components/dashboard/navigation";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/authorization";
import { getAdminDashboardSummaryAction, type AdminDashboardResult } from "./actions";
import { FadeIn } from "@/components/animations";
import { LineChart } from "@/components/dashboard/LineChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { RecentProofsTable } from "./RecentProofsTable";

export default async function AdminDashboard() {
  const profile = await requireAuthenticatedUser();
  requireRole(profile, ["admin"]);

  const summaryResult = (await getAdminDashboardSummaryAction()) as AdminDashboardResult;
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

  // Fallback data aman dari nilai undefined/null
  const summary = summaryResult.summary ?? {};
  const pendingProofCount = summary.pendingProofCount ?? 0;
  const pendingPaymentCount = summary.pendingPaymentCount ?? 0;
  const totalBillAmount = summary.totalBillAmount ?? 0;
  const totalOutstanding = summary.totalOutstanding ?? 0;
  const totalPaid = summary.totalPaid ?? 0;
  const monthlyPayments = summary.monthlyPayments ?? [];
  const recentProofs = summary.recentProofs ?? [];
  const paymentComposition = summary.paymentComposition ?? [];

  const attentionItems = [
    ...(pendingProofCount > 0
      ? [
          {
            label: "Bukti pembayaran menunggu verifikasi",
            count: pendingProofCount,
            href: "/dashboard/admin/payment-proofs",
            tone: "warning" as const,
          },
        ]
      : []),
    ...(pendingPaymentCount > 0
      ? [
          {
            label: "Pembayaran pending perlu diperiksa",
            count: pendingPaymentCount,
            href: "/dashboard/admin/payments",
            tone: "info" as const,
          },
        ]
      : []),
  ];

  return (
    <PageContainer>
      <FadeIn>
        <div className="flex flex-col gap-6">
          <DashboardHeader fullName={profile.full_name} role={profile.role} />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <FadeIn delay={0} className="h-full">
              <StatCard
                title="Total Pemasukan"
                value={formatCurrency(totalBillAmount)}
                subtitle="Bulan Ini"
                icon="Receipt"
                colorVariant="green"
                trend={{ value: "12%", positive: true }}
              />
            </FadeIn>
            <FadeIn delay={0.1} className="h-full">
              <StatCard
                title="Tunggakan Siswa"
                value={formatCurrency(totalOutstanding)}
                subtitle="Sisa tagihan"
                icon="Users"
                colorVariant="yellow"
                trend={{ value: "5%", positive: false }}
              />
            </FadeIn>
            <FadeIn delay={0.2} className="h-full">
              <StatCard
                title="Peminatan"
                value={pendingPaymentCount.toString()}
                subtitle="Number"
                icon="FileCheck"
                colorVariant="blue"
              />
            </FadeIn>
            <FadeIn delay={0.3} className="h-full">
              <StatCard
                accent
                title="Tagihan Lunas"
                value={formatCurrency(totalPaid)}
                subtitle="Lunas"
                icon="CreditCard"
                colorVariant="teal"
                trend={{ value: "8%", positive: true }}
              />
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <FadeIn delay={0.4}>
                <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        Tren Pemasukan Bulanan
                      </h3>
                      <p className="text-xs text-muted mt-0.5">6 bulan terakhir</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs font-medium text-muted">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      <span>Tren</span>
                    </div>
                  </div>
                  <LineChart data={monthlyPayments} />
                </div>
              </FadeIn>

              <FadeIn delay={0.5}>
                <RecentProofsTable proofs={recentProofs} />
              </FadeIn>
            </div>

            <div className="space-y-6">
              <FadeIn delay={0.6}>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Komposisi Pembayaran
                  </h3>
                  <p className="text-xs text-muted mb-3">
                    Berdasarkan metode pembayaran
                  </p>
                  <DonutChart data={paymentComposition} />
                </div>
              </FadeIn>

              <FadeIn delay={0.7}>
                <AttentionSection title="Perlu Perhatian" items={attentionItems} />
              </FadeIn>

              <FadeIn delay={0.8}>
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
  if (typeof value !== "number" || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}