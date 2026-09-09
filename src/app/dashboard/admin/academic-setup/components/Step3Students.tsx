"use client";

import { useState } from "react";
import type { StudentData, Step3Props } from "./types";

export function Step3Students({ students, onChange, onSubmit, isSubmitting }: Step3Props) {
  const [newStudent, setNewStudent] = useState<StudentData>({
    nis: "",
    full_name: "",
    birth_date: "",
    address: "",
    status: "active",
  });

  const addStudent = () => {
    if (!newStudent.nis.trim() || !newStudent.full_name.trim()) return;
    onChange([...students, { ...newStudent }]);
    setNewStudent({ nis: "", full_name: "", birth_date: "", address: "", status: "active" });
  };

  const removeStudent = (index: number) => {
    onChange(students.filter((_student: StudentData, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Tambah Siswa</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nis" className="block text-xs text-muted mb-1.5">
            NIS
          </label>
          <input
            id="nis"
            type="text"
            value={newStudent.nis}
            onChange={(e) => setNewStudent({ ...newStudent, nis: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: 001"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="full_name" className="block text-xs text-muted mb-1.5">
            Nama Lengkap
          </label>
          <input
            id="full_name"
            type="text"
            value={newStudent.full_name}
            onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: Ahmad"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="birth_date" className="block text-xs text-muted mb-1.5">
            Tanggal Lahir
          </label>
          <input
            id="birth_date"
            type="date"
            value={newStudent.birth_date}
            onChange={(e) => setNewStudent({ ...newStudent, birth_date: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="address" className="block text-xs text-muted mb-1.5">
            Alamat
          </label>
          <input
            id="address"
            type="text"
            value={newStudent.address}
            onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: Jl. ABC"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <button
        onClick={addStudent}
        disabled={isSubmitting}
        className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
      >
        Tambah Siswa
      </button>
      {students.length > 0 && (
        <div className="space-y-2">
          {students.map((student: StudentData, index: number) => (
            <div key={index} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <div>
                <p className="text-sm text-foreground">{student.full_name} ({student.nis})</p>
                {student.birth_date && <p className="text-xs text-muted">Lahir: {student.birth_date}</p>}
              </div>
              <button onClick={() => removeStudent(index)} className="text-xs text-danger hover:underline">
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={isSubmitting || students.length === 0}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
        >
          {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {isSubmitting ? "Menyimpan..." : "Simpan & Lanjut"}
        </button>
      </div>
    </div>
  );
}
