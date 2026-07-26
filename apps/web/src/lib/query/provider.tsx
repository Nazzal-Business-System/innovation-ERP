"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "./client";

/**
 * One QueryClient per authenticated app lifetime.
 * useState initializer guarantees the client is not recreated on re-renders.
 */
export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createAppQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
