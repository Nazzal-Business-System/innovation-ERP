import { HrGate } from "@/components/hr/hr-gate";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <HrGate>{children}</HrGate>;
}
