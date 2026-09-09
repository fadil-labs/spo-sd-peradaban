"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getStudentAction } from "../actions";
import { User, Users, GraduationCap } from "lucide-react";

type GuardianLink = {
  id: string;
  relationship: string;
  profiles: { id: string; full_name: string; email: string; phone: string; role: string }[];
};

type EnrollmentItem = {
  id: string;
  status: string;
  class_id: string;
  academic_year_id: string;
  class_name: string;
  academic_year_name: string;
};

type StudentDetail = {
  student: {
    id: string;
    nis: string;
    nisn: string | null;
    full_name: string;
    gender: string | null;
    religion: string | null;
    birth_place: string | null;
    birth_date: string | null;
    address: string | null;
    address_street: string | null;
    rt_rw: string | null;
    kelurahan: string | null;
    kecamatan: string | null;
    city: string | null;
    postal_code: string | null;
    student_phone: string | null;
    student_email: string | null;
    child_order: number | null;
    father_name: string | null;
    father_occupation: string | null;
    mother_name: string | null;
    mother_occupation: string | null;
    guardian_phone: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  guardians: GuardianLink[];
  enrollments: EnrollmentItem[];
};

type Tab = "profil" | "orangtua" | "enrollment";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profil", label: "Profil", icon: User },
  { key: "orangtua", label: "Orang Tua", icon: Users },
  { key: "enrollment", label: "Enrollment", icon: GraduationCap },
];

function StudentDetailPageInner({ studentId }: { studentId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentDetail | null>(null);

  const formatDate = (date: string | null) =>
    date ? new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-gray-100 text-gray-700",
      graduated: "bg-blue-100 text-blue-700",
      transferred: "bg-yellow-100 text-yellow-700",
    };
    const labels: Record<string, string> = {
      active: "Aktif",
      inactive: "Tidak Aktif",
      graduated: "Lulus",
      transferred: "Pindah",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      const result = await getStudentAction(studentId);
      if (!isMounted) return;
      if ("error" in result) {
        setError(result.error);
      } else {
        setData(result as StudentDetail);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

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
            <p className="text-sm text-danger">{error || "Siswa tidak ditemukan."}</p>
          </Card>
        </div>
      </PageContainer>
    );
  }

  const { student, guardians, enrollments } = data;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={student.full_name}
          description={`NIS: ${student.nis} ${student.nisn ? `| NISN: ${student.nisn}` : ""}`}
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
            <h3 className="text-base font-semibold text-foreground mb-4">Profil Siswa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted mb-1">NIS</p>
                <p className="text-foreground font-medium">{student.nis}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">NISN</p>
                <p className="text-foreground font-medium">{student.nisn || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Nama Lengkap</p>
                <p className="text-foreground font-medium">{student.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Jenis Kelamin</p>
                <p className="text-foreground font-medium">{student.gender === "L" ? "Laki-laki" : student.gender === "P" ? "Perempuan" : "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Tempat Lahir</p>
                <p className="text-foreground font-medium">{student.birth_place || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Tanggal Lahir</p>
                <p className="text-foreground font-medium">{formatDate(student.birth_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Agama</p>
                <p className="text-foreground font-medium">{student.religion || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Status</p>
                <div className="mt-1">{getStatusBadge(student.status)}</div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted mb-1">Alamat</p>
                <p className="text-foreground font-medium">
                  {[student.address_street, student.rt_rw, student.kelurahan, student.kecamatan, student.city, student.postal_code]
                    .filter(Boolean)
                    .join(", ") || student.address || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">No Telepon Siswa</p>
                <p className="text-foreground font-medium">{student.student_phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Email Siswa</p>
                <p className="text-foreground font-medium">{student.student_email || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Anak Ke</p>
                <p className="text-foreground font-medium">{student.child_order ?? "-"}</p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "orangtua" && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Data Orang Tua / Wali</h3>
            {guardians.length === 0 ? (
              <p className="text-sm text-muted">Belum ada data orang tua yang terhubung.</p>
            ) : (
              <div className="space-y-3">
                {guardians.map((guardian) => {
                  const profile = Array.isArray(guardian.profiles) ? guardian.profiles[0] : guardian.profiles;
                  return (
                    <div key={guardian.id} className="rounded-md border border-border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile?.full_name ?? "-"}</p>
                          <p className="text-xs text-muted mt-1 capitalize">{guardian.relationship}</p>
                        </div>
                        <span className="text-xs text-muted">{profile?.role ?? "-"}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted">Email</p>
                          <p className="text-foreground">{profile?.email || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted">No HP</p>
                          <p className="text-foreground">{profile?.phone || "-"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {activeTab === "enrollment" && (
          <Card>
            <h3 className="text-base font-semibold text-foreground mb-4">Riwayat Enrollment</h3>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted">Belum ada data enrollment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium text-muted">Tahun Ajaran</th>
                      <th className="px-3 py-2 text-left font-medium text-muted">Kelas</th>
                      <th className="px-3 py-2 text-left font-medium text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 text-foreground">{enrollment.academic_year_name}</td>
                        <td className="px-3 py-2 text-foreground">{enrollment.class_name}</td>
                        <td className="px-3 py-2">
                          <span className="capitalize">{enrollment.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string | undefined;

  if (!studentId) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-6">
          <Card className="px-4 py-3 border-danger/20 bg-danger/10">
            <p className="text-sm text-danger">ID siswa tidak valid.</p>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return <StudentDetailPageInner studentId={studentId} />;
}
