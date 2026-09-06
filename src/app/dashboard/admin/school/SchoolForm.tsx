"use client";

import { useState, useCallback } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import Image from "next/image";

type School = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
};

export default function SchoolForm({ school, updateAction }: { school: School; updateAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }> }) {
  const [name, setName] = useState(school.name);
  const [address, setAddress] = useState(school.address || "");
  const [phone, setPhone] = useState(school.phone || "");
  const [email, setEmail] = useState(school.email || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(school.logo_url || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(school.logo_url || null);
    }
  }, [school.logo_url]);

  const handleRemoveLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("address", address);
    formData.append("phone", phone);
    formData.append("email", email);
    if (logoFile) {
      formData.append("logo_file", logoFile);
    }

    const result = await updateAction(formData);
    if (result?.error) {
      setError(result.error);
      toast.addToast("error", result.error);
      setIsUpdating(false);
    } else {
      setSuccess(true);
      toast.addToast("success", "Data sekolah berhasil diperbarui.");
      setIsUpdating(false);
    }
  };

  return (
     <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
           <label htmlFor="name" className="block text-xs text-muted mb-1.5">
            Nama Sekolah
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
             className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            maxLength={255}
            disabled={isUpdating}
          />
        </div>

        <div>
           <label htmlFor="address" className="block text-xs text-muted mb-1.5">
            Alamat
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={3}
            maxLength={500}
            disabled={isUpdating}
          />
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
            maxLength={50}
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
            onChange={(e) => setEmail(e.target.value)}
             className="sm:h-10 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Opsional"
            maxLength={255}
            disabled={isUpdating}
          />
        </div>

        <div>
           <label htmlFor="logo_file" className="block text-xs text-muted mb-1.5">
             Logo Sekolah
           </label>
           <div className="flex items-center gap-4">
             <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/5">
               {logoPreview ? (
                 <Image src={logoPreview} alt="Preview logo" width={64} height={64} className="h-full w-full object-cover" unoptimized />
               ) : (
                 <Upload className="h-6 w-6 text-muted" />
               )}
             </div>
             <div className="flex flex-col gap-2">
               <label
                 htmlFor="logo_file"
                 className="inline-flex cursor-pointer items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors min-h-[44px]"
               >
                 <Upload className="h-4 w-4" />
                 {logoPreview ? "Ganti Logo" : "Upload Logo"}
               </label>
               <input
                 id="logo_file"
                 type="file"
                 accept="image/*"
                 onChange={handleLogoChange}
                 className="hidden"
                 disabled={isUpdating}
               />
               {logoPreview && (
                 <button
                   type="button"
                   onClick={handleRemoveLogo}
                   className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-border bg-surface text-xs font-semibold text-danger hover:bg-danger/10 transition-colors min-h-[44px]"
                 >
                   <X className="h-3.5 w-3.5" />
                   Hapus
                 </button>
               )}
             </div>
           </div>
           <p className="text-xs text-muted mt-1.5">Format: PNG, JPG, SVG. Maksimal 2MB.</p>
         </div>

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
            <p className="text-sm text-success">Data sekolah berhasil diperbarui.</p>
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
  );
}
