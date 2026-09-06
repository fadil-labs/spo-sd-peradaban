"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, CreditCard, Bell } from "lucide-react";

const items = [
  { label: "Dashboard", href: "/dashboard/orang-tua", icon: LayoutDashboard },
  { label: "Tagihan", href: "/dashboard/orang-tua/bills", icon: Receipt },
  { label: "Pembayaran", href: "/dashboard/orang-tua/payments", icon: CreditCard },
  { label: "Notifikasi", href: "/dashboard/orang-tua/notifications", icon: Bell },
];

export default function ParentBottomNav() {
  const pathname = usePathname();

  return (
     <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-sm border-t border-border shadow-lg lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const active = item.href === "/dashboard/orang-tua"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 min-h-[44px] min-w-[44px] transition-colors ${
                active ? "text-primary" : "text-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
