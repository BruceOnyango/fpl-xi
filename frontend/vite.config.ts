/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const apiTarget = process.env.FPL_API_TARGET ?? 'http://127.0.0.1:8011';

/** Matches a module path inside node_modules/<one of pkgs>/, on either path separator. */
const vendor = (...pkgs: string[]) => new RegExp(`node_modules[/\\\\](${pkgs.join('|')})[/\\\\]`);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Deployed at example.com/fantasy-league/. Asset URLs, the router basename and the
  // mock worker all derive from this (import.meta.env.BASE_URL). Override: `vite build --base /`.
  base: '/fantasy-league/',
  // Port parity with production: the web app runs on 3011 (PM2 `fpl-web`), the API on 8011
  // (`fpl-api`). With VITE_USE_MOCKS=false, dev/preview forward the API's single entry point
  // (/fpl) to it, mirroring nginx. Override the target with FPL_API_TARGET.
  server: { port: 3011, strictPort: true, proxy: { '/fpl': apiTarget } },
  preview: { port: 3011, strictPort: true, proxy: { '/fpl': apiTarget } },
  build: {
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: app deploys don't bust the framework cache.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: vendor('react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom'),
            },
            {
              name: 'charts',
              test: vendor(
                'recharts',
                'd3-[a-z]+',
                'victory-vendor',
                'decimal\\.js-light',
                'es-toolkit',
                'immer',
                'redux',
                '@reduxjs',
                'reselect',
                'react-redux',
                'use-sync-external-store',
              ),
            },
            { name: 'data', test: vendor('@tanstack', 'zod') },
            { name: 'ui', test: vendor('@radix-ui', 'lucide-react', '@floating-ui') },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    env: { VITE_API_BASE_URL: 'http://localhost/fpl' },
    css: false,
    // axe over full pages is slow in jsdom.
    testTimeout: 30_000,
  },
});
