import { ProjectsGate } from "@/components/projects/projects-gate";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <ProjectsGate>{children}</ProjectsGate>;
}
