"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  admin: "Admin",
  bendahara: "Bendahara",
  "orang-tua": "Orang Tua",
  students: "Students",
  guardians: "Guardians",
  classes: "Classes",
  "academic-years": "Academic Years",
  enrollments: "Enrollments",
  "student-bills": "Student Bills",
  "payment-proofs": "Payment Proofs",
  "payment-gateway": "Payment Gateway",
  "payment-categories": "Payment Categories",
  "school-payment-methods": "School Payment Methods",
  "financial-reports": "Financial Reports",
  notifications: "Notifications",
  "financial-audit-logs": "Audit Logs",
  school: "Settings",
  bills: "Tagihan",
  payments: "Pembayaran",
};

function getRoleRoot(pathname: string) {
  if (pathname.startsWith("/dashboard/admin")) return { href: "/dashboard/admin", label: "Admin" };
  if (pathname.startsWith("/dashboard/bendahara")) return { href: "/dashboard/bendahara", label: "Bendahara" };
  if (pathname.startsWith("/dashboard/orang-tua")) return { href: "/dashboard/orang-tua", label: "Orang Tua" };
  return { href: "/dashboard/admin", label: "Dashboard" };
}

function formatLabel(segment: string) {
  if (segment.startsWith("[") && segment.endsWith("]")) return "Detail";
  if (LABELS[segment]) return LABELS[segment];
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const roleRoot = getRoleRoot(pathname);

  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isRoot = index === 0;
    const label = isRoot ? roleRoot.label : formatLabel(segment);
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  if (items.length === 0) return null;

  return (
    <nav className="hidden items-center gap-1 text-sm text-muted md:flex" aria-label="Breadcrumb">
      <Link href={roleRoot.href} className="flex items-center hover:text-foreground" aria-label="Dashboard">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item) => (
        <div key={item.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {item.isLast ? (
            <span className="font-medium text-foreground" aria-current="page">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
