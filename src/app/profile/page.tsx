import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const profile = await requireAuthenticatedUser();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Profil Saya
        </h1>
        <p className="text-sm text-muted">
          Kelola informasi akun dan keamanan Anda
        </p>
      </div>
      <ProfileForm profile={profile} email={user.email} />
    </div>
  );
}
