import { type LucideIcon, LayoutDashboard, Users, UserCheck, School, GraduationCap, Receipt, FileCheck, CreditCard, Tag, Landmark, BarChart3, Bell, ScrollText, Settings, UserCog, Wand2 } from "lucide-react";

export type Profile = {
  id: string;
  school_id: string;
  role: string;
  full_name: string;
  phone: string | null;
  school_logo_url: string | null;
};

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

const adminGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Akademik",
    items: [
      { label: "Students", href: "/dashboard/admin/students", icon: Users },
      { label: "Guardians", href: "/dashboard/admin/guardians", icon: UserCheck },
      { label: "Classes", href: "/dashboard/admin/classes", icon: School },
      { label: "Academic Years", href: "/dashboard/admin/academic-years", icon: GraduationCap },
      { label: "Enrollments", href: "/dashboard/admin/enrollments", icon: Users },
      { label: "Setup Akademik", href: "/dashboard/admin/academic-setup", icon: Wand2 },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { label: "Student Bills", href: "/dashboard/admin/student-bills", icon: Receipt },
      { label: "Payment Proofs", href: "/dashboard/admin/payment-proofs", icon: FileCheck },
      { label: "Payment Gateway", href: "/dashboard/admin/payment-gateway", icon: CreditCard },
      { label: "Payment Categories", href: "/dashboard/admin/payment-categories", icon: Tag },
      { label: "School Payment Methods", href: "/dashboard/admin/school-payment-methods", icon: Landmark },
      { label: "Bill Templates", href: "/dashboard/admin/bill-templates", icon: ScrollText },
      { label: "Financial Reports", href: "/dashboard/admin/financial-reports", icon: BarChart3 },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Notifications", href: "/dashboard/admin/notifications", icon: Bell },
      { label: "Audit Logs", href: "/dashboard/admin/financial-audit-logs", icon: ScrollText },
      { label: "Manajemen User", href: "/dashboard/admin/user-management", icon: UserCog },
      { label: "Settings", href: "/dashboard/admin/school", icon: Settings },
    ],
  },
];

const bendaharaGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard/bendahara", icon: LayoutDashboard },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { label: "Student Bills", href: "/dashboard/admin/student-bills", icon: Receipt },
      { label: "Payment Proofs", href: "/dashboard/admin/payment-proofs", icon: FileCheck },
      { label: "Payment Gateway", href: "/dashboard/admin/payment-gateway", icon: CreditCard },
      { label: "Financial Reports", href: "/dashboard/admin/financial-reports", icon: BarChart3 },
      { label: "Audit Logs", href: "/dashboard/admin/financial-audit-logs", icon: ScrollText },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Notifications", href: "/dashboard/bendahara/notifications", icon: Bell },
    ],
  },
];

const orangTuaGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard/orang-tua", icon: LayoutDashboard },
    ],
  },
  {
    title: "Pembayaran",
    items: [
      { label: "Tagihan", href: "/dashboard/orang-tua/bills", icon: Receipt },
      { label: "Pembayaran", href: "/dashboard/orang-tua/payments", icon: CreditCard },
    ],
  },
  {
    title: "Sistem",
    items: [
      { label: "Notifications", href: "/dashboard/orang-tua/notifications", icon: Bell },
    ],
  },
];

const guruGroups: NavGroup[] = [];

export function getNavigationForRole(role: string): NavGroup[] {
  switch (role) {
    case "admin":
      return adminGroups;
    case "bendahara":
      return bendaharaGroups;
    case "orang_tua":
      return orangTuaGroups;
    case "guru":
      return guruGroups;
    default:
      return [];
  }
}

export function hasNotificationRoute(role: string): boolean {
  const groups = getNavigationForRole(role);
  return groups.some((group) => group.items.some((item) => item.label === "Notifications"));
}

export function getNotificationHref(role: string): string | null {
  const groups = getNavigationForRole(role);
  for (const group of groups) {
    const item = group.items.find((item) => item.label === "Notifications");
    if (item) return item.href;
  }
  return null;
}
