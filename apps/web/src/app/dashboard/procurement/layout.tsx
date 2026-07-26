import { ProcurementGate } from "@/components/procurement/procurement-gate";

export default function ProcurementLayout({ children }: { children: React.ReactNode }) {
  return <ProcurementGate>{children}</ProcurementGate>;
}
