"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, ArrowRight } from "lucide-react";
import { getNavigationForRole, type NavGroup, type Profile } from "@/components/layout/navigation";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type SearchItem = {
  label: string;
  href: string;
  icon: string;
  group: string;
};

function getSearchItems(profile: Profile): SearchItem[] {
  const groups = getNavigationForRole(profile.role);
  return groups.flatMap((group: NavGroup) =>
    group.items.map((item) => ({
      label: item.label,
      href: item.href,
      icon: item.label.charAt(0).toUpperCase(),
      group: group.title,
    }))
  );
}

export function GlobalSearch({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const items = getSearchItems(profile);

  const filtered = query.trim()
    ? items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : items.slice(0, 8);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex].href);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onClose, handleSelect]);

  useEffect(() => {
    if (listRef.current && filtered.length > 0) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, filtered.length]);

  return (
    <motion.div
       className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        ref={dialogRef}
        className="relative w-full max-w-xl rounded-2xl border border-border bg-surface shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: "spring", damping: 24, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
      >
        <h2 id="global-search-title" className="sr-only">Pencarian global</h2>
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-5 w-5 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Cari halaman..."
            className="h-14 w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-2 py-1 text-xs text-muted font-mono">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted">Tidak ada hasil untuk &quot;{query}&quot;</p>
            </div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={`${item.href}-${item.label}`}
                onClick={() => handleSelect(item.href)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selectedIndex ? "bg-primary/10 text-foreground" : "text-muted hover:bg-muted/10 hover:text-foreground"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-xs font-medium uppercase text-muted">
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted truncate">{item.group}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">↑↓</kbd> Navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">↵</kbd> Pilih
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">esc</kbd> Tutup
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
