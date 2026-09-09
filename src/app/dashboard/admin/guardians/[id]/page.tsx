"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getGuardianAction } from "../actions";
import { User, Users, Wallet } from "lucide-react";

type GuardianDetail = {
  guardian: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
  };
  students: {
    id: string;
    relationship: string;
    student_id: string;
    student_nis: string;
    student_name: string;
    student_status: string;
  }[];
  payments: {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    bill_id: string;
  }[];
  bills: {
    id: string;
    title: string;
    amount: number;
    status: string;
    due_date: string;
  }[];
};

type Tab = "profil" | "siswa" | "transaksi";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profil", label: "Profil", icon: User },
  { key: "siswa", label: "Siswa", icon: Users },
  { key: "transaksi", label: "Transaksi", icon: Wallet },
];

function GuardianDetailPageInner({ guardianProfileId }: { guardianProfileId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GuardianDetail | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      const result = await getGuardianAction(guardianProfileId);
      if (!isMounted) return;
      if ("error" in result) {
        setError(result.error);
      } else {
        setData(result as GuardianDetail);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [guardianProfileId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      paid: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      expired: "bg-gray-100 text-gray-700",
      active: "bg-green-100 text-green-700",
      overdue: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      pending: "Menunggu",
      paid: "Lunas",
      failed: "Gagal",
      expired: "Kedaluwarsa",
      active: "Aktif",
      overdue: "Terlambat",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <TableSkeleton rows={5} columns={4} />
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <Card className="px-4 py-3 border-danger/20 bg-danger/10">
            <p className="text-sm text-danger">{error || "Wali tidak ditemukan."}</p>
          </Card>
        </div>
      </PageContainer>
    );
  }

  const { guardian, students, payments, bills } = data;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={guardian.full_name}
          description={`${guardian.email} ${guardian.phone ? `| ${guardian.phone}` : ""}`}
        />

        <div className="flex items-center gap-2 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "profil" && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Profil Wali</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted mb-1">Nama Lengkap</p>
                <p className="text-foreground font-medium">{guardian.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Email</p>
                <p className={`font-medium ${guardian.email?.includes("@placeholder.local") ? "text-warning" : "text-foreground"}`}>
                  {guardian.email}
                  {guardian.email?.includes("@placeholder.local") && <span className="ml-2 text-[10px] text-warning/80">(placeholder)</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">No HP</p>
                <p className="text-foreground font-medium">{guardian.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Role</p>
                <p className="text-foreground font-medium capitalize">{guardian.role}</p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "siswa" && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Siswa yang Terhubung</h3>
            {students.length === 0 ? (
              <p className="text-sm text-muted">Belum ada siswa yang terhubung dengan wali ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted">NIS</th>
                      <th className="px-3 py-2 text-left font-medium text-muted">Nama Siswa</th>
                      <th className="px-3 py-2 text-left font-medium text-muted">Hubungan</th>
                      <th className="px-3 py-2 text-left font-medium text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 text-foreground">{student.student_nis}</td>
                        <td className="px-3 py-2 text-foreground">{student.student_name}</td>
                        <td className="px-3 py-2 capitalize">{student.relationship}</td>
                        <td className="px-3 py-2">
                          <span className="capitalize">{student.student_status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === "transaksi" && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Riwayat Transaksi</h3>
            {payments.length === 0 && bills.length === 0 ? (
              <p className="text-sm text-muted">Belum ada transaksi.</p>
            ) : (
              <div className="space-y-4">
                {bills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Tagihan</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left font-medium text-muted">Tagihan</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Jumlah</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Jatuh Tempo</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bills.map((bill) => (
                            <tr key={bill.id} className="border-b border-border last:border-b-0">
                              <td className="px-3 py-2 text-foreground">{bill.title}</td>
                              <td className="px-3 py-2 text-foreground">{formatCurrency(bill.amount)}</td>
                              <td className="px-3 py-2 text-foreground">{formatDate(bill.due_date)}</td>
                              <td className="px-3 py-2">{getStatusBadge(bill.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {payments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Pembayaran</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left font-medium text-muted">Tanggal</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Jumlah</th>
                            <th className="px-3 py-2 text-left font-medium text-muted">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment) => (
                            <tr key={payment.id} className="border-b border-border last:border-b-0">
                              <td className="px-3 py-2 text-foreground">{formatDate(payment.created_at)}</td>
                              <td className="px-3 py-2 text-foreground">{formatCurrency(payment.amount)}</td>
                              <td className="px-3 py-2">{getStatusBadge(payment.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

export default function GuardianDetailPage() {
  const params = useParams();
  const guardianProfileId = params.id as string | undefined;

  if (!guardianProfileId) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <Card className="px-4 py-3 border-danger/20 bg-danger/10">
            <p className="text-sm text-danger">ID wali tidak valid.</p>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return <GuardianDetailPageInner guardianProfileId={guardianProfileId} />;
}
