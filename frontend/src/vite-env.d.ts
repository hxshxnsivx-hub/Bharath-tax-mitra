/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SW_DEV?: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// @fontsource packages ship CSS side effects only, with no type declarations.
// Declare them so both the eager `import '...'` and the on-demand `import('...')`
// in i18n/fonts.ts (OPT-UI.7) type-check. The modules have no runtime exports we use.
declare module '@fontsource/*';
declare module '@fontsource-variable/*';
