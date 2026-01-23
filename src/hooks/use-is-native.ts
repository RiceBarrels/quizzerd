'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to check if the app is running in Electron (native) or browser
 * @returns {{ isNative: boolean, platform: string | null, isLoading: boolean }}
 */
export function useIsNative() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if electronAPI is available (set by preload.js)
    const electronAPI = (window as any).electronAPI;

    if (electronAPI) {
      setIsNative(true);
      setPlatform(electronAPI.platform || null);
    } else {
      setIsNative(false);
      setPlatform(null);
    }

    setIsLoading(false);
  }, []);

  return { isNative, platform, isLoading };
}

/**
 * Check if running in Electron synchronously (for non-hook usage)
 * Note: Only use after initial render
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI;
}

/**
 * Get the electron API if available
 */
export function getElectronAPI() {
  if (typeof window === 'undefined') return null;
  return (window as any).electronAPI || null;
}
