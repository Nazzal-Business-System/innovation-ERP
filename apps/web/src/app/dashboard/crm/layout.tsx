import { CrmGate } from "@/components/crm/crm-gate";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmGate>{children}</CrmGate>;
}
