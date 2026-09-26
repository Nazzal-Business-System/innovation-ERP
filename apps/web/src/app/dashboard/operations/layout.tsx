import { OperationsGate } from "@/components/operations/operations-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { OPERATIONS_PERMISSIONS, PROCUREMENT_PERMISSIONS, SALES_PERMISSIONS } from "@ierp/shared";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return <OperationsGate><WriteRouteGate anyOf={[OPERATIONS_PERMISSIONS.WRITE, PROCUREMENT_PERMISSIONS.WRITE, SALES_PERMISSIONS.WRITE]} backHref="/dashboard/operations">{children}</WriteRouteGate></OperationsGate>;
}
