"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { getStudentAction } from "../actions";
import { User, Users, GraduationCap, ArrowLeft, Calendar, MapPin, Phone, Mail } from "lucide-react";

type GuardianLink = {
  id: string;
  relationship: string;
  profiles: { id: string; full_name: string; email: string; phone: string; role: string };
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
  { key: "profil", label: "Profil Siswa", icon: User },
  { key: "orangtua", label: "Orang Tua / Wali", icon: Users },
  { key: "enrollment", label: "Riwayat Kelas", icon: GraduationCap },
];

function StudentDetailPageInner({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentDetail | null>(null);

  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

  const getStatusBadge = (status: string) => {
    const labels: Record<string, { label: string; bg: string; text: string }> = {
      active: { label: "Aktif", bg: "bg-[#0C3B2E]/10", text: "text-[#0C3B2E]" },
      inactive: { label: "Tidak Aktif", bg: "bg-[#7A7A7A]/10", text: "text-[#7A7A7A]" },
      graduated: { label: "Lulus", bg: "bg-[#2563EB]/10", text: "text-[#2563EB]" },
      transferred: { label: "Pindah", bg: "bg-[#C28E38]/10", text: "text-[#C28E38]" },
    };
    const conf = labels[status] || {
      label: status,
      bg: "bg-gray-100",
      text: "text-gray-700",
    };
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${conf.bg} ${conf.text}`}>
        {conf.label}
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
      if ("error" in result && typeof result.error === "string") {
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
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-4 sm:p-6 text-[#1A1A1A]">
        <TableSkeleton rows={5} columns={4} />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-4 sm:p-6 text-[#1A1A1A]">
        <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
          <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">
            {error || "Siswa tidak ditemukan."}
          </p>
        </div>
      </PageContainer>
    );
  }

  const { student, guardians, enrollments } = data;

  return (
    <PageContainer className="bg-[#F5F3EC] min-h-screen p-3 sm:p-5 md:p-6 text-[#1A1A1A]">
      <div className="flex flex-col gap-5 sm:gap-6 max-w-[1600px] mx-auto">
        {/* HEADER CONTAINER */}
        <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push("/dashboard/admin/students")}
              className="p-2 bg-[#F5F3EC] border border-[#E5E0D8] rounded-xl hover:bg-[#EAE6DC] transition-colors mt-0.5"
            >
              <ArrowLeft className="h-4 w-4 text-[#1A1A1A]" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
                  {student.full_name}
                </h1>
                {getStatusBadge(student.status)}
              </div>
              <p className="text-xs sm:text-sm text-[#7A7A7A] mt-0.5">
                NIS: <span className="font-bold text-[#1A1A1A]">{student.nis}</span>{" "}
                {student.nisn && (
                  <>
                    | NISN: <span className="font-bold text-[#1A1A1A]">{student.nisn}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-[#E5E0D8] shadow-sm overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#0C3B2E] text-white shadow-sm"
                    : "text-[#666] hover:text-[#1A1A1A] hover:bg-[#F5F3EC]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT: PROFIL */}
        {activeTab === "profil" && (
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">Informasi Pribadi & Kontak</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <span className="text-[#8A8A8A] font-medium block mb-1">NIS / NISN</span>
                <span className="font-bold text-[#1A1A1A]">
                  {student.nis} / {student.nisn || "-"}
                </span>
              </div>

              <div className="p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <span className="text-[#8A8A8A] font-medium block mb-1">Jenis Kelamin</span>
                <span className="font-bold text-[#1A1A1A]">
                  {student.gender === "L"
                    ? "Laki-laki"
                    : student.gender === "P"
                    ? "Perempuan"
                    : "-"}
                </span>
              </div>

              <div className="p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <span className="text-[#8A8A8A] font-medium block mb-1">Tempat, Tanggal Lahir</span>
                <span className="font-bold text-[#1A1A1A]">
                  {student.birth_place || "-"}, {formatDate(student.birth_date)}
                </span>
              </div>

              <div className="p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <span className="text-[#8A8A8A] font-medium block mb-1">Agama</span>
                <span className="font-bold text-[#1A1A1A]">{student.religion || "-"}</span>
              </div>

              <div className="p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <span className="text-[#8A8A8A] font-medium block mb-1">Anak Ke</span>
                <span className="font-bold text-[#1A1A1A]">{student.child_order ?? "-"}</span>
              </div>

              <div className="p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <span className="text-[#8A8A8A] font-medium block mb-1">No HP Siswa</span>
                <span className="font-bold text-[#1A1A1A]">{student.student_phone || "-"}</span>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 p-3 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8]">
                <span className="text-[#8A8A8A] font-medium block mb-1">Alamat Lengkap</span>
                <span className="font-bold text-[#1A1A1A]">
                  {[
                    student.address_street,
                    student.rt_rw,
                    student.kelurahan,
                    student.kecamatan,
                    student.city,
                    student.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ") || student.address || "-"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: ORANG TUA */}
        {activeTab === "orangtua" && (
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">Data Orang Tua / Wali Terhubung</h3>
            {guardians.length === 0 ? (
              <p className="text-xs text-[#7A7A7A]">Belum ada data orang tua yang terhubung.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {guardians.map((guardian) => (
                  <div
                    key={guardian.id}
                    className="p-4 rounded-2xl border border-[#E5E0D8] bg-[#FDFCF9] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#1A1A1A]">
                        {guardian.profiles?.full_name ?? "-"}
                      </p>
                      <span className="px-2 py-0.5 rounded bg-[#0C3B2E]/10 text-[#0C3B2E] text-[10px] font-bold capitalize">
                        {guardian.relationship}
                      </span>
                    </div>
                    <div className="text-xs text-[#666] space-y-1 pt-1 border-t border-[#EAE6DC]">
                      <p>Email: {guardian.profiles?.email || "-"}</p>
                      <p>No HP: {guardian.profiles?.phone || "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: ENROLLMENT */}
        {activeTab === "enrollment" && (
          <div className="bg-white p-5 rounded-[20px] border border-[#E5E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">Riwayat Pendaftaran & Kelas</h3>
            {enrollments.length === 0 ? (
              <p className="text-xs text-[#7A7A7A]">Belum ada riwayat enrollment kelas.</p>
            ) : (
              <div className="space-y-2">
                {enrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="p-3.5 bg-[#F5F3EC] rounded-xl border border-[#E5E0D8] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#1A1A1A]">
                        Kelas: {enr.class_name}
                      </p>
                      <p className="text-[11px] text-[#7A7A7A]">
                        Tahun Ajaran: {enr.academic_year_name}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#0C3B2E]/10 text-[#0C3B2E] text-[10px] font-bold capitalize">
                      {enr.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
      <PageContainer className="bg-[#F5F3EC] min-h-screen p-4 sm:p-6 text-[#1A1A1A]">
        <div className="rounded-2xl border border-[#A83A32]/30 bg-[#A83A32]/10 p-4">
          <p className="text-xs sm:text-sm font-semibold text-[#A83A32]">
            ID siswa tidak valid.
          </p>
        </div>
      </PageContainer>
    );
  }

  return <StudentDetailPageInner studentId={studentId} />;
}