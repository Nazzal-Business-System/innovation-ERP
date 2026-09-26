import { CrmGate } from "@/components/crm/crm-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { CRM_PERMISSIONS } from "@ierp/shared";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmGate><WriteRouteGate anyOf={[CRM_PERMISSIONS.WRITE]} backHref="/dashboard/crm">{children}</WriteRouteGate></CrmGate>;
}
