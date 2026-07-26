import { OperationsGate } from "@/components/operations/operations-gate";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return <OperationsGate>{children}</OperationsGate>;
}
