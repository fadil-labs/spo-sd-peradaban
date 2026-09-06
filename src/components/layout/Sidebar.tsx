"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useReducedMotion } from "motion/react";
import { PanelLeft, PanelLeftClose, X } from "lucide-react";
import { getNavigationForRole, type NavGroup, type Profile } from "./navigation";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface SidebarProps {
  profile: Profile;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/admin" || href === "/dashboard/bendahara" || href === "/dashboard/orang-tua") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function Sidebar({ profile, collapsed, onToggleCollapse, isMobile, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const groups = getNavigationForRole(profile.role);
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, mobileOpen);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          {profile.school_logo_url ? (
            <Image src={profile.school_logo_url} alt="Logo sekolah" width={40} height={40} className="h-10 w-10 object-contain" unoptimized />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <span className="text-lg font-bold text-white">SPO</span>
            </div>
          )}
        </div>
        {!collapsed && !isMobile && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white leading-tight">SPO</span>
            <span className="text-xs text-white/60 leading-tight">SD Peradaban</span>
          </div>
        )}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-3 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all focus:ring-2 focus:ring-white/20 focus:ring-offset-2"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Sidebar">
        {groups.map((group: NavGroup) => (
          <div key={group.title} className="mb-5">
            {!collapsed && (
              <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-widest text-white/40">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={isMobile ? onCloseMobile : undefined}
                    className={[
                      "group flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                      collapsed && !isMobile ? "justify-center" : "",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                    title={collapsed && !isMobile ? item.label : undefined}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-white/70 group-hover:text-white"}`} />
                    {(!collapsed || isMobile) && <span className="ml-3 truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!isMobile && (
        <div className="border-t border-white/10 p-2">
          <button
            onClick={onToggleCollapse}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg p-3 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all focus:ring-2 focus:ring-white/20 focus:ring-offset-2"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : undefined}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={onCloseMobile}
              aria-hidden="true"
            />
            <motion.aside
              ref={drawerRef}
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#0a3d2e] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
              style={{
                backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M30 0L60 30L30 60L0 30L30 0z\" fill=\"none\" stroke=\"rgba(255,255,255,0.03)\" stroke-width=\"1\"/%3E%3C/svg%3E')",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 200 }}
      className="hidden lg:flex h-screen flex-col border-r border-white/10 bg-[#0a3d2e] transition-all"
      style={{
        backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M30 0L60 30L30 60L0 30L30 0z\" fill=\"none\" stroke=\"rgba(255,255,255,0.03)\" stroke-width=\"1\"/%3E%3C/svg%3E')",
      }}
    >
      {sidebarContent}
    </motion.aside>
  );
}
