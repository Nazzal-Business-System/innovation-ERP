import { AccountingGate } from "@/components/accounting/accounting-gate";

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return <AccountingGate>{children}</AccountingGate>;
}
