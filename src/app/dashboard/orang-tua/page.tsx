import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  Wallet, 
  FileText, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  User,
  CreditCard
} from "lucide-react";

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "orang_tua") {
    redirect("/login");
  }

  // Ambil relasi anak (student_guardians)
  const { data: guardianRelations } = await supabase
    .from("student_guardians")
    .select(`
      students (
        id,
        nis,
        full_name,
        student_enrollments (
          classes (name)
        )
      )
    `)
    .eq("guardian_profile_id", user.id);

  const children = (guardianRelations || []).map((g: any) => g.students).filter(Boolean);

  // Ambil semua tagihan anak
  const studentIds = children.map((c: any) => c.id);
  
  let bills: any[] = [];
  if (studentIds.length > 0) {
    const { data: billsData } = await supabase
      .from("student_bills")
      .select(`
        id,
        amount,
        status,
        due_date,
        billing_period_start,
        billing_period_end,
        students (id, nis, full_name),
        payment_categories (name)
      `)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    bills = billsData || [];
  }

  // Hitung statistik keuangan
  const totalBillAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  
  // Ambil riwayat pembayaran untuk tagihan-tagihan ini
  const billIds = bills.map(b => b.id);
  let payments: any[] = [];
  if (billIds.length > 0) {
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("amount, status, student_bill_id")
      .in("student_bill_id", billIds)
      .in("status", ["completed", "success", "pending"]);

    payments = paymentsData || [];
  }

  const totalPaid = payments
    .filter(p => p.status === "completed" || p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPendingPayment = payments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const outstanding = Math.max(0, totalBillAmount - totalPaid);

  // Tagihan yang belum lunas atau overdue
  const activeBills = bills.filter(b => b.status === "pending" || b.status === "partial" || b.status === "overdue");
  const overdueOrUpcomingBills = activeBills.filter(b => {
    if (!b.due_date) return false;
    const due = new Date(b.due_date);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 7 && diffDays >= 0; // Jatuh tempo dalam 7 hari
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-8">
      {/* HEADER SELAMAT DATANG */}
      <div className="bg-white rounded-[24px] p-7 sm:p-8 border border-[#E5E0D8] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0C3B2E]/10 text-[#0C3B2E]">
            Portal Orang Tua / Wali Murid
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
            Selamat Datang, {profile.full_name || "Orang Tua"}
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7A7A] max-w-2xl leading-relaxed">
            Pantau tagihan, riwayat pembayaran, dan status administrasi putra/putri Anda di SD Peradaban dengan mudah dan transparan.
          </p>
        </div>

        {/* Info Anak Terdaftar */}
        <div className="flex items-center gap-4 bg-[#F5F3EC] p-4 rounded-2xl border border-[#E5E0D8] shrink-0">
          <div className="h-12 w-12 rounded-xl bg-[#0C3B2E] text-white flex items-center justify-center font-bold shadow-sm">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] text-[#7A7A7A] font-semibold uppercase tracking-wider">Anak Terdaftar ({children.length})</p>
            <p className="text-sm font-extrabold text-[#1A1A1A] mt-0.5">
              {children.map((c: any) => c.full_name).join(", ") || "Belum ada data anak"}
            </p>
          </div>
        </div>
      </div>

      {/* ALERT JATUH TEMPO / OVERDUE */}
      {overdueOrUpcomingBills.length > 0 && (
        <div className="bg-[#C28E38]/10 border border-[#C28E38]/30 rounded-[24px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-[#C28E38]/20 rounded-2xl text-[#C28E38] shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#1A1A1A]">Peringatan Jatuh Tempo Tagihan</h3>
              <p className="text-xs sm:text-sm text-[#555] mt-1 leading-relaxed">
                Terdapat <span className="font-bold text-[#1A1A1A]">{overdueOrUpcomingBills.length} tagihan</span> yang mendekati tanggal jatuh tempo atau belum diselesaikan. Segera lakukan pembayaran untuk menghindari kendala administrasi sekolah.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/orang-tua/bills"
            className="px-5 py-3 bg-[#C28E38] text-white rounded-xl text-xs font-bold hover:bg-[#A97A2E] transition-all shadow-sm shrink-0 text-center"
          >
            Bayar Sekarang
          </Link>
        </div>
      )}

      {/* KARTU STATISTIK KEUANGAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Total Tagihan</span>
            <div className="p-2.5 rounded-xl bg-[#0C3B2E]/10 text-[#0C3B2E]">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight">
              {formatCurrency(totalBillAmount)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">
              {bills.length} total tagihan diterbitkan
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Total Terbayar</span>
            <div className="p-2.5 rounded-xl bg-[#0C3B2E]/10 text-[#0C3B2E]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#0C3B2E] tracking-tight">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">
              Lunas terverifikasi sistem
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Sisa Tagihan</span>
            <div className="p-2.5 rounded-xl bg-[#C28E38]/10 text-[#C28E38]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#C28E38] tracking-tight">
              {formatCurrency(outstanding)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">
              Kewajiban pembayaran aktif
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider">Pending</span>
            <div className="p-2.5 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#2563EB] tracking-tight">
              {formatCurrency(totalPendingPayment)}
            </p>
            <p className="text-xs text-[#7A7A7A] mt-1">
              Menunggu verifikasi bendahara
            </p>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & MENU NAVIGASI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Tagihan Aktif & Perlu Perhatian</h2>
            <p className="text-xs sm:text-sm text-[#7A7A7A] mt-1">Daftar tagihan anak yang belum lunas atau memerlukan pembayaran segera.</p>
          </div>

          <div className="space-y-3.5">
            {activeBills.length === 0 ? (
              <div className="p-8 bg-[#F5F3EC] rounded-2xl text-center text-xs sm:text-sm text-[#7A7A7A] border border-[#E5E0D8]">
                Alhamdulillah, semua tagihan anak Anda sudah lunas!
              </div>
            ) : (
              activeBills.slice(0, 3).map((bill: any) => (
                <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F5F3EC] rounded-2xl border border-[#E5E0D8] gap-4 transition-all hover:border-[#0C3B2E]/30">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#1A1A1A]">
                      {bill.payment_categories?.name || "Tagihan"} - <span className="text-[#0C3B2E]">{bill.students?.full_name}</span>
                    </p>
                    <p className="text-xs text-[#7A7A7A]">
                      Jatuh Tempo: {bill.due_date ? new Date(bill.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E5E0D8]">
                    <span className="text-sm font-black text-[#1A1A1A]">{formatCurrency(bill.amount)}</span>
                    <Link
                      href={`/dashboard/orang-tua/bills/${bill.id}`}
                      className="px-4 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-xl hover:bg-[#10523E] transition-all shadow-sm"
                    >
                      Bayar
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              href="/dashboard/orang-tua/bills"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0C3B2E] hover:underline"
            >
              <span>Lihat Semua Tagihan</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* MENU PUSAT AKSI CEPAT */}
        <div className="bg-white p-7 rounded-[24px] border border-[#E5E0D8] shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Aksi Cepat</h2>
            <p className="text-xs sm:text-sm text-[#7A7A7A]">Pintasan menu utama orang tua.</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/dashboard/orang-tua/bills"
              className="flex items-center justify-between p-3.5 bg-[#F5F3EC] hover:bg-[#EAE6DC] rounded-2xl border border-[#E5E0D8] transition-all text-xs sm:text-sm font-bold text-[#1A1A1A]"
            >
              <span className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-[#0C3B2E]" />
                <span>Daftar Tagihan Siswa</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#7A7A7A]" />
            </Link>

            <Link
              href="/dashboard/orang-tua/payments"
              className="flex items-center justify-between p-3.5 bg-[#F5F3EC] hover:bg-[#EAE6DC] rounded-2xl border border-[#E5E0D8] transition-all text-xs sm:text-sm font-bold text-[#1A1A1A]"
            >
              <span className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-[#0C3B2E]" />
                <span>Riwayat Pembayaran & Kuitansi</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#7A7A7A]" />
            </Link>

            <Link
              href="/dashboard/orang-tua/notifications"
              className="flex items-center justify-between p-3.5 bg-[#F5F3EC] hover:bg-[#EAE6DC] rounded-2xl border border-[#E5E0D8] transition-all text-xs sm:text-sm font-bold text-[#1A1A1A]"
            >
              <span className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-[#0C3B2E]" />
                <span>Pusat Notifikasi</span>
              </span>
              <ArrowRight className="h-4 w-4 text-[#7A7A7A]" />
            </Link>
          </div>

          <div className="p-4 bg-[#0C3B2E]/5 rounded-2xl border border-[#0C3B2E]/10 text-xs text-[#0C3B2E] font-medium leading-relaxed">
            💡 Butuh bantuan administrasi? Silakan hubungi bagian keuangan SD Peradaban.
          </div>
        </div>
      </div>
    </div>
  );
}