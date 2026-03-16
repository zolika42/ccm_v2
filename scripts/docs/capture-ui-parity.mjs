#!/usr/bin/env node
/**
 * @fileoverview Captures UI parity fixture pages into PNG screenshots for docs/ui-parity-inventory.md.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const fixtureDir = join(repoRoot, 'docs/ui-parity-fixtures');
const outputDir = join(repoRoot, 'docs/screenshots/ui-parity');

const screens = [
  { name: 'login', file: 'login.html', size: '1440,1400' },
  { name: 'product-list', file: 'product-list.html', size: '1440,1800' },
  { name: 'product-detail', file: 'product-detail.html', size: '1440,1600' },
  { name: 'cart', file: 'cart.html', size: '1440,1500' },
  { name: 'checkout', file: 'checkout.html', size: '1440,2200' },
  { name: 'library', file: 'library.html', size: '1440,1600' },
];

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

for (const screen of screens) {
  const target = join(outputDir, `${screen.name}.png`);
  const url = pathToFileURL(join(fixtureDir, screen.file)).toString();
  const result = spawnSync('chromium', [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=1500',
    `--window-size=${screen.size}`,
    `--screenshot=${target}`,
    url,
  ], { stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error(`Screenshot capture failed for ${screen.name}.`);
  }
}
