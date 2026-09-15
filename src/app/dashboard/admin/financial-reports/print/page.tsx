import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFinancialSummaryAction, getFinancialTransactionsAction, FinancialReportFilters } from "../actions";
import PrintClientView from "./PrintClientView";

export default async function FinancialReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<FinancialReportFilters>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !["admin", "bendahara"].includes(profile.role)) {
    redirect("/dashboard/admin");
  }

  // Ambil data sekolah untuk kop surat
  const { data: school } = await supabase
    .from("schools")
    .select("name, address, phone, email")
    .eq("id", profile.school_id)
    .single();

  // Ambil ringkasan dan seluruh data transaksi untuk dicetak
  const [summaryResult, transactionsResult] = await Promise.all([
    getFinancialSummaryAction(resolvedSearchParams),
    getFinancialTransactionsAction({
      ...resolvedSearchParams,
      pageSize: 1000, // Ambil semua data untuk laporan cetak
    }),
  ]);

  if ("error" in summaryResult || "error" in transactionsResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600 font-bold text-sm">
        Gagal memuat data laporan untuk dicetak.
      </div>
    );
  }

  const summary = summaryResult.summary;
  const rows = "rows" in transactionsResult ? transactionsResult.rows : [];

  return (
    <PrintClientView
      school={school}
      profileName={profile.full_name || "Administrator"}
      summary={{
        totalBills: summaryResult.totalBills,
        totalBillAmount: summaryResult.totalBillAmount,
        totalPaid: summaryResult.totalPaid,
        totalOutstanding: summaryResult.totalOutstanding,
        pendingPaymentAmount: summaryResult.pendingPaymentAmount,
        pendingPaymentCount: summaryResult.pendingPaymentCount,
      }}
      rows={rows}
      filters={{
        startDate: resolvedSearchParams.startDate,
        endDate: resolvedSearchParams.endDate,
        billStatus: resolvedSearchParams.billStatus,
      }}
    />
  );
}