"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type CompactModeContextType = {
  compactMode: boolean;
  setCompactMode: (value: boolean) => void;
};

const CompactModeContext = createContext<CompactModeContextType | undefined>(
  undefined
);

const STORAGE_KEY = "quizzerd-compact-mode";

export function CompactModeProvider({
  children,
  defaultCompactMode = false,
}: {
  children: React.ReactNode;
  defaultCompactMode?: boolean;
}) {
  const [compactMode, setCompactModeState] = useState(defaultCompactMode);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCompactModeState(stored === "true");
    }
  }, []);

  // Apply compact mode class to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (compactMode) {
      root.classList.add("compact");
    } else {
      root.classList.remove("compact");
    }
  }, [compactMode, mounted]);

  const setCompactMode = (value: boolean) => {
    setCompactModeState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  return (
    <CompactModeContext.Provider value={{ compactMode, setCompactMode }}>
      {children}
    </CompactModeContext.Provider>
  );
}

export function useCompactMode() {
  const context = useContext(CompactModeContext);
  if (context === undefined) {
    throw new Error("useCompactMode must be used within a CompactModeProvider");
  }
  return context;
}
