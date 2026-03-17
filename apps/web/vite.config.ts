/**
 * @fileoverview Vite dev/build configuration for the React storefront.
 */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const envDir = resolve(__dirname, '../..');
const port = Number(process.env.WEB_PORT ?? 5173);
const ddevOrigin = process.env.DDEV_PRIMARY_URL_WITHOUT_PORT
  ? `${process.env.DDEV_PRIMARY_URL_WITHOUT_PORT}:5173`
  : undefined;

export default defineConfig({
  envDir,
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    origin: ddevOrigin,
    cors: ddevOrigin
      ? {
          origin: /https?:\/\/([A-Za-z0-9\-\.]+)?(\.ddev\.site)(?::\d+)?$/,
        }
      : true,
  },
});
