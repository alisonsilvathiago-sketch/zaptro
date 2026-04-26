/// <reference types="vite/client" />

/** Substituído em build por `vite.config.ts` → `define` (commit / deployment Vercel). */
declare const __APP_RELEASE__: string;

interface ImportMetaEnv {
  /** Base URL da API Node de e-mail (ex.: `/zaptro-mail-api` em dev com proxy, ou `https://mail.seudominio.com`). */
  readonly VITE_ZAPTRO_MAIL_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
