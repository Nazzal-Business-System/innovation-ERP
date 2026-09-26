import { SupportGate } from "@/components/support/support-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { SUPPORT_PERMISSIONS } from "@ierp/shared";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <SupportGate><WriteRouteGate anyOf={[SUPPORT_PERMISSIONS.WRITE]} backHref="/dashboard/support/tickets">{children}</WriteRouteGate></SupportGate>;
}
