import { AuthGate } from "@/components/auth/auth-gate";
import { EmployeeSelfServiceRedirect } from "@/components/hr/my-workspace-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <EmployeeSelfServiceRedirect>
        <AppShell>{children}</AppShell>
      </EmployeeSelfServiceRedirect>
    </AuthGate>
  );
}
