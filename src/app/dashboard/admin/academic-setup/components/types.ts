export type AcademicYearData = {
  name: string;
  start_date: string;
  end_date: string;
};

export type ClassData = {
  name: string;
  grade_level: string;
};

export type StudentData = {
  nis: string;
  full_name: string;
  birth_date: string;
  address: string;
  status: string;
};

export type GuardianData = {
  full_name: string;
  email: string;
  phone: string;
  relationship: string;
  student_nis: string;
};

export type Step1Props = {
  data: AcademicYearData;
  onChange: (data: AcademicYearData) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
};

export type Step2Props = {
  classes: ClassData[];
  onChange: (classes: ClassData[]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export type Step3Props = {
  students: StudentData[];
  onChange: (students: StudentData[]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export type Step4Props = {
  guardians: GuardianData[];
  onChange: (guardians: GuardianData[]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export type Step5Props = {
  academicYear: AcademicYearData;
  classes: ClassData[];
  students: StudentData[];
  guardians: GuardianData[];
};
