import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20">
          <span className="text-xl font-bold text-white">SPO</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted animate-pulse">SPO SD Peradaban</p>
        </div>
      </div>
    </div>
  );
}
