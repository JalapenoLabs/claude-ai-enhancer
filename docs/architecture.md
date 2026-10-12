# Architecture

Claude.ai Enhancer is a Manifest V3 Chrome extension written in TypeScript. It consists of a single content script
and stylesheet that run on `https://claude.ai/*`, providing Markdown export (`docs/export.md`) and bulk archive and
delete (`docs/bulk-actions.md`).

## Source layout

- `src/api/`: shared ky clients and organization lookup (`index.ts`), one file of routes per API surface
  (`routes/`), and response types.
- `src/export/`: the pure Markdown renderer and the download flow.
- `src/bulk/`: the per-kind lookup table of bulk actions and the batch runner, free of DOM concerns.
- `src/content/`: everything that touches claude.ai's DOM, started from `index.ts`.

## Build

- Vite builds `src/content/index.ts` as one IIFE bundle, `dist/content.js`, because MV3 content scripts cannot be
  ES modules.
- `public/` (the manifest, `content.css`, and `_locales/`) is copied verbatim into `dist/`.
- `dist/` is the folder loaded through `chrome://extensions` → Load unpacked.
- `yarn dev` rebuilds on change; reload the extension and the claude.ai tab to pick up changes.

## Tooling

- Yarn 4.17.0 (`node-modules` linker), Node 22.23.2 (`.nvmrc`), all dependencies pinned to exact versions.
- TypeScript is held at 6.0.x: typescript-eslint does not yet support TypeScript 7, and Yarn's TypeScript compat
  patch fails to install 7.0.
- `yarn typecheck`, `yarn lint`, `yarn test` (Vitest), `yarn build`.

## Permissions

The extension requests no permissions. The content script runs on the claude.ai origin, so its `fetch` calls to
claude.ai's APIs carry the user's session cookies, and downloads use a Blob URL with `<a download>`.

## Page integration

The extension depends on claude.ai markup through the selectors in `src/constants.ts`, and on conversation link
shapes through the patterns in `src/bulk/conversationKinds.ts`. When claude.ai changes either, those are the only
places to update. Everything the extension adds to the DOM is prefixed `claude-ai-enhancer` (`DOM_PREFIX`).

A `MutationObserver` on `document.body`, throttled to one check per animation frame, re-attaches injected UI
because claude.ai re-renders its toolbar on every in-app navigation. Injection is idempotent, keyed by a
`data-testid` on the injected element.

## Internationalization

User-facing strings go through a private i18next instance (`src/i18n/`), with `en-US` as the only shipped locale.
The manifest name and description use Chrome's own `_locales/en_US/messages.json`, since i18next cannot reach the
manifest. Console logs stay in English.
