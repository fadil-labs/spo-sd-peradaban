import {
  Navbar,
  Hero,
  TrustBenefits,
  PaymentFeatures,
  PaymentMethods,
  ParentBenefits,
  SchoolBenefits,
  HowItWorks,
  Advantages,
  FAQ,
  FinalCTA,
  Footer,
} from "@/components/sections";
import { getPublicSchoolLogoAction } from "@/app/actions/get-public-school-logo";

export default async function Home() {
  const { logo_url } = await getPublicSchoolLogoAction();

  return (
    <div className="min-h-screen">
      <Navbar logoUrl={logo_url} />
      <main>
        <Hero />
        <TrustBenefits />
        <PaymentFeatures />
        <PaymentMethods />
        <ParentBenefits />
        <SchoolBenefits />
        <HowItWorks />
        <Advantages />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
