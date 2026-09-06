"use client";

import Link from "next/link";
import { Menu, Bell } from "lucide-react";
import { ProfileMenu } from "./ProfileMenu";
import { Breadcrumbs } from "./Breadcrumbs";
import { getNotificationHref, hasNotificationRoute } from "./navigation";
import type { Profile } from "./navigation";

interface TopbarProps {
  profile: Profile;
  onToggleSidebar: () => void;
  isMobile: boolean;
  onLogout: () => Promise<void>;
  mobileOpen?: boolean;
  unreadCount?: number;
}

export function Topbar({ profile, onToggleSidebar, isMobile, onLogout, mobileOpen, unreadCount }: TopbarProps) {
  const notificationHref = hasNotificationRoute(profile.role) ? getNotificationHref(profile.role) : null;
  const displayCount = unreadCount && unreadCount > 99 ? "99+" : unreadCount;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-3 text-muted hover:bg-muted/10 hover:text-foreground lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-2">
        {notificationHref && (
          <Link
            href={notificationHref}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-3 text-muted hover:bg-muted/10 hover:text-foreground relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount && unreadCount > 0 && (
               <span className="absolute -top-1 -right-1 z-10 h-5 min-w-[20px] px-1 rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center animate-[scaleIn_0.2s_ease-out]">
                {displayCount}
              </span>
            )}
          </Link>
        )}
        <ProfileMenu profile={profile} onLogout={onLogout} />
      </div>
    </header>
  );
}
