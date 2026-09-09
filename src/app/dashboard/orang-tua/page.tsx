import { PageContainer } from "@/components/layout/PageContainer";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getQuickActions } from "@/components/dashboard/navigation";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FadeIn } from "@/components/animations";

export default async function OrangTuaDashboard() {
  const profile = await requireAuthenticatedUser();
  requireRole(profile, ["orang_tua"]);

  const supabase = await createClient();

  const { data: guardianRelations, error: guardianError } = await supabase
    .from("student_guardians")
    .select("student_id")
    .eq("guardian_profile_id", profile.id);

  if (guardianError || !guardianRelations || guardianRelations.length === 0) {
    return (
      <PageContainer>
        <FadeIn>
          <DashboardHeader fullName={profile.full_name} role={profile.role} />
          <div className="mt-6">
            <EmptyState
              title="Belum ada data anak yang terhubung"
              description="Hubungi administrator sekolah untuk menghubungkan data anak ke akun Anda."
            />
          </div>
        </FadeIn>
      </PageContainer>
    );
  }

  const studentIds = guardianRelations.map((g) => g.student_id);

  const { data: billIdsResult } = await supabase
    .from("student_bills")
    .select("id")
    .in("student_id", studentIds);

  const billIds = billIdsResult?.map((b) => b.id) || [];

  const [billsResult, paymentsResult] = await Promise.all([
    supabase.from("student_bills").select("id, amount, status", { count: "exact" }).in("student_id", studentIds),
    billIds.length > 0
      ? supabase
          .from("payments")
          .select("id, amount, status, student_bill_id", { count: "exact" })
          .in("student_bill_id", billIds)
          .in("status", ["completed", "pending"])
      : { data: [] as { id: string; amount: number; status: string; student_bill_id?: string }[], count: 0, error: null },
  ]);

  const bills = (billsResult.data || []) as { id: string; amount: number; status: string }[];
  const payments = (paymentsResult.data || []) as { id: string; amount: number; status: string; student_bill_id?: string }[];

  const totalBillAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalOutstanding = Math.max(0, totalBillAmount - totalPaid);
  const pendingPaymentCount = payments.filter((p) => p.status === "pending").length;

  const quickActions = getQuickActions(profile.role);

  return (
    <PageContainer>
      <FadeIn>
        <div className="flex flex-col gap-4">
          <DashboardHeader fullName={profile.full_name} role={profile.role} />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <FadeIn delay={0} className="h-full">
              <StatCard
                title="Total Tagihan"
                value={formatCurrency(totalBillAmount)}
                subtitle={`${billsResult.count || 0} tagihan`}
                icon="Receipt"
                colorVariant="blue"
              />
            </FadeIn>
            <FadeIn delay={0.1} className="h-full">
              <StatCard
                title="Total Terbayar"
                value={formatCurrency(totalPaid)}
                subtitle="Termasuk pending"
                icon="CreditCard"
                colorVariant="green"
              />
            </FadeIn>
            <FadeIn delay={0.2} className="h-full">
              <StatCard
                title="Outstanding"
                value={formatCurrency(totalOutstanding)}
                subtitle="Sisa tagihan"
                icon="FileCheck"
                colorVariant="yellow"
              />
            </FadeIn>
            <FadeIn delay={0.3} className="h-full">
              <StatCard
                accent
                title="Pembayaran Pending"
                value={pendingPaymentCount.toString()}
                subtitle="Menunggu verifikasi"
                icon="Receipt"
                colorVariant="teal"
              />
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="xl:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FadeIn delay={0.4} className="h-full">
                  <Link
                    href="/dashboard/orang-tua/bills"
                    className="block h-full rounded-2xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <h2 className="text-base font-semibold text-foreground">Tagihan Anak</h2>
                    <p className="text-xs text-muted mt-1">Lihat dan bayar tagihan anak</p>
                  </Link>
                </FadeIn>
                <FadeIn delay={0.5} className="h-full">
                  <Link
                    href="/dashboard/orang-tua/notifications"
                    className="block h-full rounded-2xl border border-border bg-white p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <h2 className="text-base font-semibold text-foreground">Notifikasi</h2>
                    <p className="text-xs text-muted mt-1">Pusat notifikasi</p>
                  </Link>
                </FadeIn>
              </div>
            </div>
            <div className="space-y-3">
              <FadeIn delay={0.6} className="h-full">
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
