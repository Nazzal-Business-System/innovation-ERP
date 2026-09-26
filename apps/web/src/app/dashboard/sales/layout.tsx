import { SalesGate } from "@/components/sales/sales-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { SALES_PERMISSIONS } from "@ierp/shared";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <SalesGate><WriteRouteGate anyOf={[SALES_PERMISSIONS.WRITE]} backHref="/dashboard/sales/orders">{children}</WriteRouteGate></SalesGate>;
}
