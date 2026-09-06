"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, LogOut } from "lucide-react";
import type { Profile } from "./navigation";

interface ProfileMenuProps {
  profile: Pick<Profile, "full_name" | "role">;
  onLogout: () => Promise<void>;
}

export function ProfileMenu({ profile, onLogout }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await onLogout();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/10 active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-xs font-semibold">{profile.full_name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight">{profile.full_name}</p>
          <p className="text-xs text-muted capitalize leading-tight">{profile.role.replace("_", " ")}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-surface py-1 shadow-sm z-50"
          >
            <button
              onClick={handleLogout}
              className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 active:scale-[0.98] transition-all"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
