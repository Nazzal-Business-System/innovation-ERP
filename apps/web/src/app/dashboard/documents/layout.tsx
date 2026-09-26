import { DocumentsGate } from "@/components/documents/documents-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { DOCUMENTS_PERMISSIONS } from "@ierp/shared";

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return <DocumentsGate><WriteRouteGate anyOf={[DOCUMENTS_PERMISSIONS.WRITE]} backHref="/dashboard/documents/files">{children}</WriteRouteGate></DocumentsGate>;
}
