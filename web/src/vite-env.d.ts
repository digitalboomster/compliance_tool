/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Set to "true" to call a real backend; otherwise the in-browser mock API is used. */
  readonly VITE_USE_REAL_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
