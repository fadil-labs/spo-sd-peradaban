interface DashboardHeaderProps {
  fullName: string;
  role: string;
  schoolName?: string;
}

export function DashboardHeader({ fullName, role, schoolName }: DashboardHeaderProps) {
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const roleLabel = role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {schoolName || "SPO SD Peradaban"}
          </h1>
          <p className="text-sm text-muted">
            {fullName} • {roleLabel}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted">{today}</p>
    </div>
  );
}
