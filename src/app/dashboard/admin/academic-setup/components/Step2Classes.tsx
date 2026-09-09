"use client";

import { useState } from "react";
import type { ClassData, Step2Props } from "./types";

export function Step2Classes({ classes, onChange, onSubmit, isSubmitting }: Step2Props) {
  const [newClassName, setNewClassName] = useState("");
  const [newGradeLevel, setNewGradeLevel] = useState("");

  const addClass = () => {
    if (!newClassName.trim()) return;
    onChange([...classes, { name: newClassName.trim(), grade_level: newGradeLevel.trim() }]);
    setNewClassName("");
    setNewGradeLevel("");
  };

  const removeClass = (index: number) => {
    onChange(classes.filter((_cls: ClassData, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground">Tambah Kelas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="class_name" className="block text-xs text-muted mb-1.5">
            Nama Kelas
          </label>
          <input
            id="class_name"
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: 1A"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label htmlFor="grade_level" className="block text-xs text-muted mb-1.5">
            Tingkatan
          </label>
          <input
            id="grade_level"
            type="text"
            value={newGradeLevel}
            onChange={(e) => setNewGradeLevel(e.target.value)}
            className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Contoh: 1"
            disabled={isSubmitting}
          />
        </div>
      </div>
      <button
        onClick={addClass}
        disabled={isSubmitting}
        className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
      >
        Tambah Kelas
      </button>
      {classes.length > 0 && (
        <div className="space-y-2">
          {classes.map((cls: ClassData, index: number) => (
            <div key={index} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <div>
                <p className="text-sm text-foreground">{cls.name}</p>
                {cls.grade_level && <p className="text-xs text-muted">Tingkatan: {cls.grade_level}</p>}
              </div>
              <button onClick={() => removeClass(index)} className="text-xs text-danger hover:underline">
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={isSubmitting || classes.length === 0}
          className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
        >
          {isSubmitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {isSubmitting ? "Menyimpan..." : "Simpan & Lanjut"}
        </button>
      </div>
    </div>
  );
}
