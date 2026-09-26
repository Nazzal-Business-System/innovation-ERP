import { ProcurementGate } from "@/components/procurement/procurement-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { PROCUREMENT_PERMISSIONS } from "@ierp/shared";

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  return <ProcurementGate><WriteRouteGate anyOf={[PROCUREMENT_PERMISSIONS.WRITE]} backHref="/dashboard/procurement/purchase-orders">{children}</WriteRouteGate></ProcurementGate>;
}
