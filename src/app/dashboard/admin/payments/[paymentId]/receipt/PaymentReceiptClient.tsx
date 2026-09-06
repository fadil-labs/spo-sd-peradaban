"use client";

import Link from "next/link";

type ReceiptData = {
  school: { name: string; address: string | null; phone: string | null; email: string | null };
  student: { full_name: string; nis: string } | null;
  bill: { id: string; amount: number; status: string; billing_period_start: string | null; billing_period_end: string | null; payment_category_name: string | null };
  payment: { id: string; amount: number; payment_date: string; reference_number: string | null; status: string; payment_method_name: string; payment_method_type: string | null };
  totalPaid: number;
  remainingBalance: number;
};

type Props = {
  receipt: ReceiptData;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

const formatDateShort = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const getPaymentStatusLabel = (status: string) => {
  switch (status) {
    case "completed": return "Berhasil";
    case "pending": return "Menunggu";
    case "failed": return "Gagal";
    case "cancelled": return "Dibatalkan";
    default: return status;
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-success/10 text-success";
    case "pending": return "bg-primary/10 text-primary";
    case "failed": return "bg-danger/10 text-danger";
    default: return "bg-muted/20 text-muted";
  }
};

const getBillStatusLabel = (status: string) => {
  switch (status) {
    case "paid": return "Lunas";
    case "partial": return "Cicilan";
    case "pending": return "Menunggu";
    case "overdue": return "Terlambat";
    case "cancelled": return "Dibatalkan";
    default: return status;
  }
};

const getBillStatusColor = (status: string) => {
  switch (status) {
    case "paid": return "bg-success/10 text-success";
    case "partial": return "bg-primary/10 text-primary";
    case "overdue": return "bg-danger/10 text-danger";
    case "cancelled": return "bg-danger/10 text-danger";
    default: return "bg-muted/20 text-muted";
  }
};

function LogoPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-lg bg-background/40">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-[10px] text-muted mt-1 font-medium">Logo</span>
    </div>
  );
}

function QRPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-lg bg-background/40">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h1m-6.93-.636l.636.636M5.636 5.636l-.636-.636M21 12h1M4 12H3m14.95 6.95l.636.636M5.636 18.364l-.636-.636" />
      </svg>
      <span className="text-[10px] text-muted mt-1 font-medium">QR</span>
    </div>
  );
}

export default function PaymentReceiptClient({ receipt }: Props) {
  const { school, student, bill, payment, totalPaid, remainingBalance } = receipt;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-start justify-between print:hidden">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bukti Pembayaran</h2>
          <p className="text-sm text-muted mt-1">Receipt pembayaran yang sah</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors"
          >
            Cetak
          </button>
          <Link
            href="/dashboard/admin/student-bills"
            className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold hover:bg-muted/10 transition-colors"
          >
            Kembali
          </Link>
        </div>
      </div>

      <div className="receipt-container rounded-2xl border border-border bg-surface p-6 shadow-sm print:shadow-none print:border-0">
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
          <LogoPlaceholder />
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-foreground">{school.name}</h1>
            {school.address && <p className="text-sm text-muted mt-1">{school.address}</p>}
            {(school.phone || school.email) && (
              <p className="text-sm text-muted mt-1">
                {school.phone && `${school.phone}`}
                {school.phone && school.email && " | "}
                {school.email && school.email}
              </p>
            )}
          </div>
          <QRPlaceholder />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
          <div>
            <p className="text-xs text-muted mb-1 uppercase tracking-wide">Siswa</p>
            <p className="text-sm font-semibold text-foreground">{student?.full_name || "-"}</p>
            {student?.nis && <p className="text-xs text-muted">NIS: {student.nis}</p>}
          </div>
          <div>
            <p className="text-xs text-muted mb-1 uppercase tracking-wide">No. Pembayaran</p>
            <p className="text-sm font-semibold text-foreground font-mono">{payment.reference_number || payment.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1 uppercase tracking-wide">Tanggal Pembayaran</p>
            <p className="text-sm font-semibold text-foreground">{formatDateTime(payment.payment_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1 uppercase tracking-wide">Metode Pembayaran</p>
            <p className="text-sm font-semibold text-foreground">{payment.payment_method_name}</p>
            {payment.payment_method_type && (
              <p className="text-xs text-muted capitalize">{payment.payment_method_type.replace("_", " ")}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/50 p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Detail Tagihan</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted mb-1 uppercase tracking-wide">Kategori</p>
              <p className="text-sm font-semibold text-foreground">{bill.payment_category_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1 uppercase tracking-wide">Periode</p>
              <p className="text-sm font-semibold text-foreground">
                {bill.billing_period_start && bill.billing_period_end
                  ? `${formatDateShort(bill.billing_period_start)} - ${formatDateShort(bill.billing_period_end)}`
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted">Nominal Tagihan</span>
            <span className="text-sm font-medium text-foreground">{formatCurrency(bill.amount)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted">Pembayaran Ini</span>
            <span className="text-sm font-medium text-foreground">{formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted">Total Telah Dibayar</span>
            <span className="text-sm font-medium text-foreground">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted">Sisa Tagihan</span>
            <span className="text-sm font-medium text-foreground">{formatCurrency(remainingBalance)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted uppercase tracking-wide">Status Pembayaran</span>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusColor(payment.status)}`}>
              {getPaymentStatusLabel(payment.status)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted uppercase tracking-wide">Status Tagihan</span>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBillStatusColor(bill.status)}`}>
              Tagihan: {getBillStatusLabel(bill.status)}
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-xs text-muted uppercase tracking-wide mb-8">Tanda Tangan Pihak Sekolah</p>
              <div className="border-b border-foreground/30 w-40 mb-2" />
              <p className="text-xs text-muted">( Kepala Sekolah / Bendahara )</p>
            </div>
            <div className="flex-1 flex flex-col items-end">
              <p className="text-xs text-muted uppercase tracking-wide mb-8">Tanda Tangan Orang Tua / Wali</p>
              <div className="border-b border-foreground/30 w-40 mb-2" />
              <p className="text-xs text-muted">( Orang Tua / Wali Siswa )</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted text-center print:text-black">
        Bukti pembayaran ini digenerate secara otomatis oleh sistem. Mohon simpan untuk keperluan pencatatan.
      </p>
    </div>
  );
}
