'use client';

import { useEffect } from 'react';

export function ElectronBodyClass() {
  useEffect(() => {
    // Check if running in Electron and add class to body
    const electron = (window as any).electronAPI;
    if (electron?.isElectron) {
      document.body.classList.add('electron-app');

      // Add platform-specific class
      if (electron.isMac) {
        document.body.classList.add('electron-mac');
      } else if (electron.isWindows) {
        document.body.classList.add('electron-windows');
      } else {
        document.body.classList.add('electron-linux');
      }
    }
  }, []);

  return null;
}
