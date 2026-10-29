/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base path or URL. Default "/fpl" (the backend's single entry point). */
  readonly VITE_API_BASE_URL?: string;
  /** "false" to hit a real backend instead of the MSW mock. Default: mocks on. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
