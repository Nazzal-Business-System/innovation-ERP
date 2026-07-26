import { KnowledgeGate } from "@/components/knowledge/knowledge-gate";

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return <KnowledgeGate>{children}</KnowledgeGate>;
}
