export interface ElectronAPI {
  platform: 'darwin' | 'win32' | 'linux';
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isElectron: boolean;
  getAppVersion: () => Promise<string>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
