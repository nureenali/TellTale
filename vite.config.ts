import './server/env.ts';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { apiRouter } from './server/api.ts';

function apiMiddlewarePlugin(): Plugin {
  const app = express();
  app.use(apiRouter);

  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        (app as any)(req, res, next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load environment variables for the current mode (.env, .env.local, .env.[mode], etc.)
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react(), tailwindcss(), apiMiddlewarePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
