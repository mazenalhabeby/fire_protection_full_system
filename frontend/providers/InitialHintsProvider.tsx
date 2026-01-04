"use client";

import { createContext, useContext, type ReactNode } from "react";

interface InitialHintsContextType {
  // Session hint from cookie - indicates user likely has active session
  // Used to show authenticated UI skeleton while auth is being verified
  hasSessionHint: boolean;
}

const InitialHintsContext = createContext<InitialHintsContextType>({
  hasSessionHint: false,
});

interface InitialHintsProviderProps {
  children: ReactNode;
  hasSessionHint: boolean;
}

export function InitialHintsProvider({
  children,
  hasSessionHint,
}: InitialHintsProviderProps) {
  return (
    <InitialHintsContext.Provider value={{ hasSessionHint }}>
      {children}
    </InitialHintsContext.Provider>
  );
}

export function useInitialHints() {
  return useContext(InitialHintsContext);
}
