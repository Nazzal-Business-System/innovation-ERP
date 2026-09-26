import { KnowledgeGate } from "@/components/knowledge/knowledge-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { KNOWLEDGE_PERMISSIONS } from "@ierp/shared";

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return <KnowledgeGate><WriteRouteGate anyOf={[KNOWLEDGE_PERMISSIONS.WRITE]} backHref="/dashboard/knowledge/articles">{children}</WriteRouteGate></KnowledgeGate>;
}
