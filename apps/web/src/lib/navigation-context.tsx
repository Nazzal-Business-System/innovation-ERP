"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { RouteProgressBar } from "@/components/navigation/route-progress-bar";

interface NavigationContextValue {
  isNavigating: boolean;
  pendingHref: string | null;
  startNavigation: (href?: string) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const prevPath = useRef(pathname);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNavigation = useCallback((href?: string) => {
    setIsNavigating(true);
    if (href) setPendingHref(href);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(() => {
      setIsNavigating(false);
      setPendingHref(null);
    }, 10_000);
  }, []);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      const done = setTimeout(() => {
        setIsNavigating(false);
        setPendingHref(null);
      }, 120);
      return () => clearTimeout(done);
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
  }, []);

  return (
    <NavigationContext.Provider value={{ isNavigating, pendingHref, startNavigation }}>
      <RouteProgressBar active={isNavigating} />
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}
