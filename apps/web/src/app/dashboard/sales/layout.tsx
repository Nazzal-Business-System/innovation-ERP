import { SalesGate } from "@/components/sales/sales-gate";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <SalesGate>{children}</SalesGate>;
}
