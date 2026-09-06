const STATUS_CLASSES: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-muted/20 text-muted",
  graduated: "bg-primary/10 text-primary",
  transferred: "bg-warning/10 text-warning",
  pending: "bg-primary/10 text-primary",
  partial: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  overdue: "bg-danger/10 text-danger",
  cancelled: "bg-muted/20 text-muted",
  approved: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
  success: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger",
  expired: "bg-muted/20 text-muted",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  inactive: "Tidak Aktif",
  graduated: "Lulus",
  transferred: "Pindah",
  pending: "Menunggu",
  partial: "Cicilan",
  paid: "Lunas",
  overdue: "Terlambat",
  cancelled: "Dibatalkan",
  approved: "Disetujui",
  rejected: "Ditolak",
  success: "Berhasil",
  failed: "Gagal",
  expired: "Kedaluwarsa",
};

export function StatusBadge({ status }: { status: string }) {
  const className = STATUS_CLASSES[status] || "bg-muted/20 text-muted";
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
