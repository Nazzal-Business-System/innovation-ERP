export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#05070f]">
      {children}
    </div>
  );
}
