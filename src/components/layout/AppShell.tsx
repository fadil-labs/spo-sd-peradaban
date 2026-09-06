"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import ParentBottomNav from "./ParentBottomNav";
import type { Profile } from "./navigation";
import { getUnreadNotificationCountAction } from "@/lib/notifications/service";
import { GlobalSearch } from "@/components/operational/GlobalSearch";

function useMediaQuery(query: string): boolean {
  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };
  const getServerSnapshot = () => false;
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function createUnreadCountStore(initialCount: number) {
  let count = initialCount;
  const listeners = new Set<() => void>();

  return {
    getCount: () => count,
    setCount: (newCount: number) => {
      count = newCount;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const unreadCountStore = createUnreadCountStore(0);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const unreadCount = useSyncExternalStore(unreadCountStore.subscribe, unreadCountStore.getCount, () => 0);
  const isMobile = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const p = (await res.json()) as Profile;
          setProfile(p);
        } else {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else if (!globalSearchOpen) {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, globalSearchOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const refreshUnreadCount = async () => {
    const result = await getUnreadNotificationCountAction();
    if ("count" in result) {
      unreadCountStore.setCount(result.count);
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshUnreadCount();
      }
    };
    const handleNotificationRefresh = () => {
      refreshUnreadCount();
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("notification:refresh", handleNotificationRefresh);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("notification:refresh", handleNotificationRefresh);
    };
  }, []);

  const handleLogout = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleSidebar = () => setSidebarCollapsed((c) => !c);
  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profile={profile}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          profile={profile}
          onToggleSidebar={openMobile}
          isMobile={isMobile}
          onLogout={handleLogout}
          mobileOpen={mobileOpen}
          unreadCount={unreadCount}
        />
        <main id="main-content" className={`flex-1 min-h-0 overflow-y-auto ${profile.role === "orang_tua" && isMobile ? "pb-[calc(56px+env(safe-area-inset-bottom))]" : ""}`}>
          {children}
        </main>
      </div>
      {profile.role === "orang_tua" && isMobile && <ParentBottomNav />}
      <AnimatePresence>
        {globalSearchOpen && profile && (
          <GlobalSearch
            profile={profile}
            onClose={() => setGlobalSearchOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
