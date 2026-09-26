import { ProjectsGate } from "@/components/projects/projects-gate";
import { WriteRouteGate } from "@/components/auth/write-route-gate";
import { PROJECTS_PERMISSIONS } from "@ierp/shared";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <ProjectsGate><WriteRouteGate anyOf={[PROJECTS_PERMISSIONS.WRITE]} backHref="/dashboard/projects">{children}</WriteRouteGate></ProjectsGate>;
}
