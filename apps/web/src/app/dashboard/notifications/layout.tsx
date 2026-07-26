import { NotificationsGate } from "@/components/notifications/notifications-gate";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <NotificationsGate>{children}</NotificationsGate>;
}
