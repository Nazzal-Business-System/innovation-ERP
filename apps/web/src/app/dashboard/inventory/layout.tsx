import { InventoryGate } from "@/components/inventory/inventory-gate";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <InventoryGate>{children}</InventoryGate>;
}
