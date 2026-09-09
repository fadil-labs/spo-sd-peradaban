"use client";

import { Card } from "@/components/ui/card";
import type { AcademicYearData, ClassData, StudentData, GuardianData, Step5Props } from "./types";

export function Step5Review({ academicYear, classes, students, guardians }: Step5Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Review Data</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Tahun Ajaran</h4>
          <p className="text-xs text-muted">Nama: {academicYear.name || "-"}</p>
          <p className="text-xs text-muted">Mulai: {academicYear.start_date || "-"}</p>
          <p className="text-xs text-muted">Selesai: {academicYear.end_date || "-"}</p>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Kelas</h4>
          <p className="text-xs text-muted">Total: {classes.length} kelas</p>
          {classes.slice(0, 3).map((cls: ClassData, index: number) => (
            <p key={index} className="text-xs text-muted">
              {cls.name} {cls.grade_level ? `(${cls.grade_level})` : ""}
            </p>
          ))}
          {classes.length > 3 && <p className="text-xs text-muted">... dan {classes.length - 3} lainnya</p>}
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Siswa</h4>
          <p className="text-xs text-muted">Total: {students.length} siswa</p>
          {students.slice(0, 3).map((student: StudentData, index: number) => (
            <p key={index} className="text-xs text-muted">
              {student.full_name} ({student.nis})
            </p>
          ))}
          {students.length > 3 && <p className="text-xs text-muted">... dan {students.length - 3} lainnya</p>}
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Wali</h4>
          <p className="text-xs text-muted">Total: {guardians.length} wali</p>
          {guardians.slice(0, 3).map((guardian: GuardianData, index: number) => (
            <p key={index} className="text-xs text-muted">
              {guardian.full_name} - {guardian.student_nis}
            </p>
          ))}
          {guardians.length > 3 && <p className="text-xs text-muted">... dan {guardians.length - 3} lainnya</p>}
        </Card>
      </div>
    </div>
  );
}
