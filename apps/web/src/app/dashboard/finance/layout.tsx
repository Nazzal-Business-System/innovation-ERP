import { FinanceGate } from "@/components/finance/finance-gate";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FinanceGate>{children}</FinanceGate>;
}
