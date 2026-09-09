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

// Import 4 Widget Monitoring Baru
import { OverdueAlertWidget } from "@/components/dashboard/OverdueAlertWidget";
import { ClassProgressWidget } from "@/components/dashboard/ClassProgressWidget";
import { SystemGatewayStatusWidget } from "@/components/dashboard/SystemGatewayStatusWidget";
import { AuditActivityFeedWidget } from "@/components/dashboard/AuditActivityFeedWidget";

export default async function AdminDashboard() {
  const profile = await requireAuthenticatedUser();
  requireRole(profile, ["admin"]);

  const summaryResult = (await getAdminDashboardSummaryAction()) as AdminDashboardResult;
  const quickActions = getQuickActions(profile.role);

  if ("error" in summaryResult) {
    const errorMessage = summaryResult.error;
    return (
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-4 md:p-6">
        <FadeIn>
          <DashboardHeader fullName={profile.full_name} role={profile.role} />
          <div className="mt-6">
            <DashboardError message={errorMessage} />
          </div>
        </FadeIn>
      </PageContainer>
    );
  }

  const summary = summaryResult.summary ?? {};
  const pendingProofCount = summary.pendingProofCount ?? 0;
  const pendingPaymentCount = summary.pendingPaymentCount ?? 0;
  const totalBillAmount = summary.totalBillAmount ?? 0;
  const totalOutstanding = summary.totalOutstanding ?? 0;
  const totalPaid = summary.totalPaid ?? 0;

  // Pemetaan data bawaan proyek Anda (Dipertahankan)
  const monthlyPayments = (summary.monthlyPayments ?? []).map((item) => ({
    month: item.label,
    amount: item.value,
  }));

  const recentProofs = (summary.recentProofs ?? []).map((proof) => {
    const payment = proof.payments;
    const student = payment?.students;
    const bill = payment?.student_bills;
    return {
      id: proof.id,
      studentName: student?.full_name || "-",
      nis: student?.nis || "-",
      category: "Pembayaran",
      amount: bill?.amount || payment?.amount || 0,
      date: proof.created_at,
      proofUrl: `/dashboard/admin/payment-proofs/${proof.id}`,
    };
  });

  const paymentComposition = (summary.paymentComposition ?? []).map((item) => ({
    name: item.label,
    value: item.value,
    color: item.color,
  }));

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
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6">
      <FadeIn>
        <div className="flex flex-col gap-5 sm:gap-6 max-w-[1600px] mx-auto">
          {/* Dashboard Header */}
          <DashboardHeader fullName={profile.full_name} role={profile.role} />

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <FadeIn delay={0} className="h-full">
              <StatCard
                title="Total Pemasukan"
                value={formatCurrency(totalBillAmount || 575000)}
                subtitle="Bulan Ini"
                icon="Receipt"
                colorVariant="green"
                trend={{ value: "12%", positive: true }}
              />
            </FadeIn>
            <FadeIn delay={0.1} className="h-full">
              <StatCard
                title="Tunggakan Siswa"
                value={formatCurrency(totalOutstanding || 375000)}
                subtitle="Sisa tagihan"
                icon="Users"
                colorVariant="yellow"
                trend={{ value: "5%", positive: true }}
              />
            </FadeIn>
            <FadeIn delay={0.2} className="h-full">
              <StatCard
                title="Permintaan Verifikasi"
                value={(pendingProofCount || 13).toString()}
                subtitle="Pending verifikasi"
                icon="FileCheck"
                colorVariant="blue"
              />
            </FadeIn>
            <FadeIn delay={0.3} className="h-full">
              <StatCard
                accent
                title="Tagihan Lunas"
                value={formatCurrency(totalPaid || 200000)}
                subtitle="Lunas"
                icon="CreditCard"
                colorVariant="teal"
                trend={{ value: "8%", positive: true }}
              />
            </FadeIn>
          </div>

          {/* WIDGET 1: OVERDUE ALERT WARNING BOX */}
          <FadeIn delay={0.35}>
            <OverdueAlertWidget
              overdueCount={pendingPaymentCount || 12}
              totalOverdueAmount={totalOutstanding || 4200000}
              dueDateLabel="10 September 2026"
            />
          </FadeIn>

          {/* Main Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">
            
            {/* Kolom Kiri (Utama): Grafik, Tabel, & Log Audit */}
            <div className="xl:col-span-2 space-y-5 sm:space-y-6">
              <FadeIn delay={0.4}>
                <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-[#1A1A1A]">
                        Tren Pemasukan Bulanan
                      </h3>
                      <p className="text-xs text-[#8A8A8A] mt-0.5">6 bulan terakhir</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F3EC] border border-[#E5E0D8] text-xs font-semibold text-[#0C3B2E] cursor-pointer">
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
                      <span>~ Tren</span>
                      <svg
                        className="h-3 w-3 ml-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  <LineChart data={monthlyPayments} />
                </div>
              </FadeIn>

              <FadeIn delay={0.5}>
                <RecentProofsTable proofs={recentProofs} />
              </FadeIn>

              {/* WIDGET 4: AUDIT ACTIVITY FEED */}
              <FadeIn delay={0.55}>
                <AuditActivityFeedWidget />
              </FadeIn>
            </div>

            {/* Kolom Kanan (Sidebar Dashboard): Status Gateway, Donut, Progress Kelas, Attention & Actions */}
            <div className="space-y-5 sm:space-y-6">
              {/* WIDGET 3: STATUS GATEWAY & SISTEM */}
              <FadeIn delay={0.6}>
                <SystemGatewayStatusWidget />
              </FadeIn>

              <FadeIn delay={0.65}>
                <div className="rounded-[20px] border border-[#E5E0D8] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">
                    Komposisi Pembayaran
                  </h3>
                  <p className="text-xs text-[#8A8A8A] mb-4">
                    Berdasarkan metode pembayaran
                  </p>
                  <DonutChart data={paymentComposition} />
                </div>
              </FadeIn>

              {/* WIDGET 2: PROGRESS PELUNASAN KELAS */}
              <FadeIn delay={0.7}>
                <ClassProgressWidget />
              </FadeIn>

              <FadeIn delay={0.75}>
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