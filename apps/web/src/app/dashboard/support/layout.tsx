import { SupportGate } from "@/components/support/support-gate";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <SupportGate>{children}</SupportGate>;
}
