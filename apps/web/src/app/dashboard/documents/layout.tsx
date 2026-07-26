import { DocumentsGate } from "@/components/documents/documents-gate";

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return <DocumentsGate>{children}</DocumentsGate>;
}
