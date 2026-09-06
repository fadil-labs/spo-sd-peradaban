"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction, changePasswordAction, logoutAction } from "./actions";

type Profile = {
  full_name: string;
  phone: string | null;
  school_id: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  bendahara: "Bendahara",
  orang_tua: "Orang Tua",
};

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const toast = useToast();

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    const formData = new FormData();
    formData.append("full_name", fullName);
    formData.append("phone", phone);

    const result = await updateProfileAction(formData);
    if (result?.error) {
      setUpdateError(result.error);
      toast.addToast("error", result.error);
      setIsUpdating(false);
    } else {
      setUpdateSuccess(true);
      toast.addToast("success", "Profil berhasil diperbarui.");
      setIsUpdating(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    const formData = new FormData();
    formData.append("new_password", newPassword);
    formData.append("confirm_password", confirmPassword);

    const result = await changePasswordAction(formData);
    if (result?.error) {
      setPasswordError(result.error);
      toast.addToast("error", result.error);
      setIsChangingPassword(false);
    } else {
      setPasswordSuccess(true);
      toast.addToast("success", "Password berhasil diperbarui.");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    toast.addToast("success", "Berhasil keluar.");
  };

  return (
     <div className="w-full max-w-2xl space-y-6">
       <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Informasi Akun
        </h2>
        <form className="space-y-5" onSubmit={handleProfileSubmit}>
          <div>
             <label htmlFor="full_name" className="block text-xs text-muted mb-1.5">
              Nama Lengkap
            </label>
            <input
              id="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
               className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              maxLength={255}
              disabled={isUpdating}
            />
          </div>

          <div>
             <label htmlFor="email" className="block text-xs text-muted mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              readOnly
              className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted">Dikelola oleh sistem autentikasi</p>
          </div>

          <div>
             <label htmlFor="school_id" className="block text-xs text-muted mb-1.5">
              Sekolah
            </label>
            <input
              id="school_id"
              type="text"
              value={profile.school_id}
              readOnly
              className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted">Ditentukan oleh keanggotaan tenant</p>
          </div>

          <div>
             <label htmlFor="role" className="block text-xs text-muted mb-1.5">
              Role
            </label>
            <input
              id="role"
              type="text"
              value={ROLE_LABELS[profile.role] || profile.role}
              readOnly
              className="h-10 w-full rounded-md border border-border bg-muted/20 px-3 text-sm text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-muted">Dikontrol oleh sistem</p>
          </div>

          <div>
             <label htmlFor="phone" className="block text-xs text-muted mb-1.5">
              Nomor Telepon
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
               className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Opsional"
              maxLength={20}
              disabled={isUpdating}
            />
          </div>

          {updateError && (
            <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
              <p className="text-sm text-danger">{updateError}</p>
            </div>
          )}

          {updateSuccess && (
            <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
              <p className="text-sm text-success">Profil berhasil diperbarui.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full h-11 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>

       <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
         <h2 className="text-lg font-semibold text-foreground mb-6">
           Ubah Password
         </h2>
        <form className="space-y-5" onSubmit={handlePasswordSubmit}>
          <div>
             <label htmlFor="new_password" className="block text-xs text-muted mb-1.5">
              Password Baru
            </label>
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
               className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Minimal 8 karakter"
              required
              minLength={8}
              disabled={isChangingPassword}
            />
          </div>

          <div>
             <label htmlFor="confirm_password" className="block text-xs text-muted mb-1.5">
              Konfirmasi Password
            </label>
            <input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
               className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Ulangi password baru"
              required
              minLength={8}
              disabled={isChangingPassword}
            />
          </div>

          {passwordError && (
            <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
              <p className="text-sm text-danger">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
              <p className="text-sm text-success">Password berhasil diperbarui.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full h-11 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            {isChangingPassword ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>

       <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
         <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full h-11 rounded-md border border-danger text-danger text-sm font-semibold hover:bg-danger/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isLoggingOut && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </div>
  );
}
