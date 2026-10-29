/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/** Matches a module path inside node_modules/<one of pkgs>/, on either path separator. */
const vendor = (...pkgs: string[]) => new RegExp(`node_modules[/\\\\](${pkgs.join('|')})[/\\\\]`);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Deployed at bruceonyango.link/fantasy-league/. Asset URLs, the router basename and the
  // mock worker all derive from this (import.meta.env.BASE_URL). Override: `vite build --base /`.
  base: '/fantasy-league/',
  // With VITE_USE_MOCKS=false the dev/preview servers forward the API's single entry point
  // (/fpl) to the FastAPI app, mirroring the production reverse proxy.
  server: { proxy: { '/fpl': 'http://127.0.0.1:8000' } },
  preview: { proxy: { '/fpl': 'http://127.0.0.1:8000' } },
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
    env: { VITE_API_BASE: 'http://localhost/fpl' },
    css: false,
    // axe over full pages is slow in jsdom.
    testTimeout: 30_000,
  },
});
