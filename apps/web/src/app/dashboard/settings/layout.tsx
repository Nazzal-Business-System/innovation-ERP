import { SettingsGate } from "@/components/settings/settings-gate";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsGate>{children}</SettingsGate>;
}
