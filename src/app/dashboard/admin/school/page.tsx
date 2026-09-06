import { getSchoolAction, updateSchoolAction } from "./actions";
import SchoolForm from "./SchoolForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/operational/PageHeader";

export default async function SchoolPage() {
  const result = await getSchoolAction();

  if ("error" in result || !result.school) {
    return (
      <PageContainer>
        <PageHeader title="Settings" description="Pengaturan sekolah" />
        <div className="mt-6 rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
          <p className="text-sm text-danger">{"error" in result ? result.error : "Gagal memuat data sekolah."}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Pengaturan sekolah" />
      <div className="mt-6">
        <SchoolForm school={result.school} updateAction={updateSchoolAction} />
      </div>
    </PageContainer>
  );
}
