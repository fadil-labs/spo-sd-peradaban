"use client";

import { useState } from "react";
import type { GuardianData, Step4Props } from "./types";

export function Step4Guardians({ guardians, onChange, onSubmit, isSubmitting }: Step4Props) {
  const [newGuardian, setNewGuardian] = useState<GuardianData>({
    full_name: "",
    email: "",
    phone: "",
    relationship: "wali",
    student_nis: "",
  });

  const addGuardian = () => {
    if (!newGuardian.full_name.trim() || !newGuardian.email.trim() || !newGuardian.student_nis.trim()) return;
    onChange([...guardians, { ...newGuardian }]);
    setNewGuardian({ full_name: "", email: "", phone: "", relationship: "wali", student_nis: "" });
  };

  const removeGuardian = (index: number) => {
    onChange(guardians.filter((_guardian: GuardianData, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Tambah Wali</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="full_name" className="block text-xs text-muted mb-1.5">
            Nama Wali
          </label>
          <input
            id="full_name"
            type="text"
            value={newGuardian.full_name}
            onChange={(e) => setNewGuardian({ ...newGuardian, full_name: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: Budi"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs text-muted mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={newGuardian.email}
            onChange={(e) => setNewGuardian({ ...newGuardian, email: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: budi@example.com"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-xs text-muted mb-1.5">
            No HP
          </label>
          <input
            id="phone"
            type="text"
            value={newGuardian.phone}
            onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: 08123456789"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="relationship" className="block text-xs text-muted mb-1.5">
            Hubungan
          </label>
          <select
            id="relationship"
            value={newGuardian.relationship}
            onChange={(e) => setNewGuardian({ ...newGuardian, relationship: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="ayah">Ayah</option>
            <option value="ibu">Ibu</option>
            <option value="wali">Wali</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="student_nis" className="block text-xs text-muted mb-1.5">
          NIS Siswa
        </label>
        <input
          id="student_nis"
          type="text"
          value={newGuardian.student_nis}
          onChange={(e) => setNewGuardian({ ...newGuardian, student_nis: e.target.value })}
          className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Contoh: 001"
          disabled={isSubmitting}
        />
      </div>
      <button
        onClick={addGuardian}
        disabled={isSubmitting}
        className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
      >
        Tambah Wali
      </button>
      {guardians.length > 0 && (
        <div className="space-y-2">
          {guardians.map((guardian: GuardianData, index: number) => (
            <div key={index} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <div>
                <p className="text-sm text-foreground">{guardian.full_name} ({guardian.email})</p>
                <p className="text-xs text-muted">Siswa: {guardian.student_nis} • {guardian.relationship}</p>
              </div>
              <button onClick={() => removeGuardian(index)} className="text-xs text-danger hover:underline">
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={isSubmitting || guardians.length === 0}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
        >
          {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {isSubmitting ? "Menyimpan..." : "Simpan & Lanjut"}
        </button>
      </div>
    </div>
  );
}
