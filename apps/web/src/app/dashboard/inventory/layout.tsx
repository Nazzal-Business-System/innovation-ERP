import { InventoryGate } from "@/components/inventory/inventory-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { INVENTORY_PERMISSIONS } from "@ierp/shared";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <InventoryGate><WriteRouteGate anyOf={[INVENTORY_PERMISSIONS.WRITE]} backHref="/dashboard/inventory/transfers">{children}</WriteRouteGate></InventoryGate>;
}
