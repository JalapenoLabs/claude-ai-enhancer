// Core
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Manifest V3 content scripts cannot be ES modules, so the content script is
// bundled as a single self-invoking file. `public/` (manifest and _locales) is
// copied verbatim into `dist/`, which is the folder loaded as the unpacked extension.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/content/index.ts'),
      formats: ['iife'],
      name: 'ClaudeAiEnhancer',
      fileName: () => 'content.js',
    },
  },
})
