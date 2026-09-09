"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  getAcademicSetupWizardData,
  createAcademicYearAction,
  createWizardClassesAction,
  createWizardStudentsAction,
  createWizardGuardiansAction,
} from "./actions";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Step1AcademicYear } from "./components/Step1AcademicYear";
import { Step2Classes } from "./components/Step2Classes";
import { Step3Students } from "./components/Step3Students";
import { Step4Guardians } from "./components/Step4Guardians";
import { Step5Review } from "./components/Step5Review";
import type { AcademicYearData, ClassData, StudentData, GuardianData } from "./components/types";

type Step = 1 | 2 | 3 | 4 | 5;

type AcademicYear = {
  id: string;
  name: string;
  is_active: boolean;
};

type WizardData = {
  academicYear: {
    name: string;
    start_date: string;
    end_date: string;
  };
  classes: Array<{ name: string; grade_level: string }>;
  students: Array<{ nis: string; full_name: string; birth_date: string; address: string; status: string }>;
  guardians: Array<{ full_name: string; email: string; phone: string; relationship: string; student_nis: string }>;
};

export default function AcademicSetupPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [wizardData, setWizardData] = useState<WizardData>({
    academicYear: { name: "", start_date: "", end_date: "" },
    classes: [],
    students: [],
    guardians: [],
  });

  const toast = useToast();

  const loadInitialData = useCallback(async () => {
    setError(null);
    try {
      const result = await getAcademicSetupWizardData();
      setAcademicYears(result.academicYears);
      if (result.academicYears.length > 0) {
        const activeYear = result.academicYears.find((ay) => ay.is_active) || result.academicYears[0];
        setSelectedAcademicYearId(activeYear.id);
      }
    } catch {
      setError("Gagal memuat data awal.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const result = await getAcademicSetupWizardData();
        setAcademicYears(result.academicYears);
        if (result.academicYears.length > 0) {
          const activeYear = result.academicYears.find((ay) => ay.is_active) || result.academicYears[0];
          setSelectedAcademicYearId(activeYear.id);
        }
      } catch {
        setError("Gagal memuat data awal.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateAcademicYear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formDataObj = new FormData();
    formDataObj.append("name", wizardData.academicYear.name);
    formDataObj.append("start_date", wizardData.academicYear.start_date);
    formDataObj.append("end_date", wizardData.academicYear.end_date);

    const result = await createAcademicYearAction(formDataObj);
    if ("error" in result) {
      const message = result.error || "Terjadi kesalahan.";
      setError(message);
      toast.addToast("error", message);
    } else {
      toast.addToast("success", "Tahun ajaran berhasil dibuat.");
      await loadInitialData();
      setCurrentStep(2);
    }
    setIsSubmitting(false);
  };

  const handleCreateClasses = async () => {
    if (wizardData.classes.length === 0) {
      setError("Minimal satu kelas harus ditambahkan.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formDataObj = new FormData();
    formDataObj.append("academic_year_id", selectedAcademicYearId);
    formDataObj.append("classes", JSON.stringify(wizardData.classes));

    const result = await createWizardClassesAction(formDataObj);
    if ("error" in result) {
      const message = result.error || "Terjadi kesalahan.";
      setError(message);
      toast.addToast("error", message);
    } else {
      toast.addToast("success", `${result.count} kelas berhasil dibuat.`);
      setCurrentStep(3);
    }
    setIsSubmitting(false);
  };

  const handleCreateStudents = async () => {
    if (wizardData.students.length === 0) {
      setError("Minimal satu siswa harus ditambahkan.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formDataObj = new FormData();
    formDataObj.append("students", JSON.stringify(wizardData.students));

    const result = await createWizardStudentsAction(formDataObj);
    if ("error" in result) {
      const message = result.error || "Terjadi kesalahan.";
      setError(message);
      toast.addToast("error", message);
    } else {
      toast.addToast("success", `${result.count} siswa berhasil dibuat.`);
      setCurrentStep(4);
    }
    setIsSubmitting(false);
  };

  const handleCreateGuardians = async () => {
    if (wizardData.guardians.length === 0) {
      setError("Minimal satu wali harus ditambahkan.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formDataObj = new FormData();
    formDataObj.append("guardians", JSON.stringify(wizardData.guardians));

    const result = await createWizardGuardiansAction(formDataObj);
    if ("error" in result) {
      const message = result.error || "Terjadi kesalahan.";
      setError(message);
      toast.addToast("error", message);
    } else {
      toast.addToast("success", `Setup wali selesai: ${result.data.successCount} berhasil, ${result.data.errorCount} gagal.`);
      setCurrentStep(5);
    }
    setIsSubmitting(false);
  };

  const goNext = () => setCurrentStep((prev) => Math.min(5, prev + 1) as Step);
  const goBack = () => setCurrentStep((prev) => Math.max(1, prev - 1) as Step);

  const steps = [
    { number: 1, title: "Tahun Ajaran", description: "Buat tahun ajaran baru" },
    { number: 2, title: "Kelas", description: "Tambah kelas untuk tahun ajaran" },
    { number: 3, title: "Siswa", description: "Import atau input siswa" },
    { number: 4, title: "Wali", description: "Hubungkan wali dengan siswa" },
    { number: 5, title: "Review", description: "Konfirmasi dan selesai" },
  ];

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Setup Akademik</h1>
          <p className="text-sm text-muted mt-1">Buat tahun ajaran, kelas, siswa, dan wali dalam satu langkah.</p>
        </div>

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === step.number
                      ? "bg-primary text-white"
                      : currentStep > step.number
                      ? "bg-green-100 text-green-700"
                      : "bg-muted/10 text-muted"
                  }`}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </div>
                <span className="text-xs text-muted">{step.title}</span>
              </div>
              {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted" />}
            </div>
          ))}
        </div>

        <Card>
          {currentStep === 1 && (
            <Step1AcademicYear
              data={wizardData.academicYear}
              onChange={(academicYear: AcademicYearData) => setWizardData({ ...wizardData, academicYear })}
              onSubmit={handleCreateAcademicYear}
              isSubmitting={isSubmitting}
            />
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">Tambah Kelas</h3>
              <p className="text-xs text-muted">Pilih tahun ajaran dan tambahkan kelas untuk tahun ajaran tersebut.</p>
              <div>
                <label htmlFor="academic_year_id" className="block text-xs text-muted mb-1.5">
                  Tahun Ajaran
                </label>
                <select
                  id="academic_year_id"
                  value={selectedAcademicYearId}
                  onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                  className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="">Pilih tahun ajaran</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>
              <Step2Classes
                classes={wizardData.classes}
                onChange={(classes: ClassData[]) => setWizardData({ ...wizardData, classes })}
                onSubmit={handleCreateClasses}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <Step3Students
                students={wizardData.students}
                onChange={(students: StudentData[]) => setWizardData({ ...wizardData, students })}
                onSubmit={handleCreateStudents}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <Step4Guardians
                guardians={wizardData.guardians}
                onChange={(guardians: GuardianData[]) => setWizardData({ ...wizardData, guardians })}
                onSubmit={handleCreateGuardians}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {currentStep === 5 && (
            <Step5Review
              academicYear={wizardData.academicYear}
              classes={wizardData.classes}
              students={wizardData.students}
              guardians={wizardData.guardians}
            />
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={goBack}
              disabled={currentStep === 1 || isSubmitting}
              className="h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
            {currentStep < 5 && (
              <button
                onClick={goNext}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
              >
                Lanjut
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
