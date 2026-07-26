import { ReportsGate } from "@/components/reports/reports-gate";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <ReportsGate>{children}</ReportsGate>;
}
