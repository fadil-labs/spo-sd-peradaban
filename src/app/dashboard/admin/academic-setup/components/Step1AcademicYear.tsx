"use client";

import type { AcademicYearData, Step1Props } from "./types";

export function Step1AcademicYear({ data, onChange, onSubmit, isSubmitting }: Step1Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Buat Tahun Ajaran</h3>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="name" className="block text-xs text-muted mb-1.5">
            Nama Tahun Ajaran
          </label>
          <input
            id="name"
            type="text"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: 2025/2026"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="block text-xs text-muted mb-1.5">
              Tanggal Mulai
            </label>
            <input
              id="start_date"
              type="date"
              value={data.start_date}
              onChange={(e) => onChange({ ...data, start_date: e.target.value })}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-xs text-muted mb-1.5">
              Tanggal Selesai
            </label>
            <input
              id="end_date"
              type="date"
              value={data.end_date}
              onChange={(e) => onChange({ ...data, end_date: e.target.value })}
              className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
          >
            {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isSubmitting ? "Menyimpan..." : "Simpan & Lanjut"}
          </button>
        </div>
      </form>
    </div>
  );
}
