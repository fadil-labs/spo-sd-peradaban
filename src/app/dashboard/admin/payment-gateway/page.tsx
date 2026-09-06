import { Suspense } from "react";
import { requireAuthenticatedUser, requireRole } from "@/lib/auth/authorization";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import PaymentGatewayClient from "./PaymentGatewayClient";

export default async function PaymentGatewayPage() {
  const profile = await requireAuthenticatedUser();
  requireRole(profile, ["admin", "bendahara"]);

  return (
    <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
      <PaymentGatewayClient />
    </Suspense>
  );
}
