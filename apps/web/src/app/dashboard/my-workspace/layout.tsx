import { MyWorkspaceGate } from "@/components/hr/my-workspace-gate";

export default function MyWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <MyWorkspaceGate>{children}</MyWorkspaceGate>;
}
