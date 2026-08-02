/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "*.glb" {
  const src: string;
  export default src;
}

declare module "virtual:pwa-register/react" {
  import type { Dispatch, SetStateAction } from "react";

  interface RegisterSWOptions {
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
