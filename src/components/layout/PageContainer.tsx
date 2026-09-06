export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`h-full ${className ?? ""}`}
      style={{
        backgroundColor: "#faf7f2",
        backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"80\" height=\"80\" viewBox=\"0 0 80 80\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M40 0L80 40L40 80L0 40L40 0z\" fill=\"none\" stroke=\"rgba(10,61,46,0.03)\" stroke-width=\"1\"/%3E%3Cpath d=\"M40 20L60 40L40 60L20 40L40 20z\" fill=\"none\" stroke=\"rgba(10,61,46,0.03)\" stroke-width=\"1\"/%3E%3C/svg%3E')",
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
