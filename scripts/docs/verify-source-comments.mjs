/**
 * @fileoverview Verifies that first-party source files carry an intent comment at the top so code-reference generation stays meaningful.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const includeRoots = ['apps/api/public', 'apps/api/src', 'apps/web/src', 'apps/web/scripts', 'scripts/db', 'scripts/docs'];
const allowedExtensions = new Set(['.php', '.ts', '.tsx', '.mjs', '.sh']);
const failures = [];

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__MACOSX' || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!allowedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const firstChunk = fs.readFileSync(fullPath, 'utf8').slice(0, 320);
    if (!firstChunk.includes('@fileoverview') && !firstChunk.includes('AUTO-GENERATED FILE')) {
      failures.push(path.relative(root, fullPath).replaceAll('\\', '/'));
    }
  }
}

for (const relativeRoot of includeRoots) {
  const absolute = path.join(root, relativeRoot);
  if (fs.existsSync(absolute)) {
    walk(absolute);
  }
}

if (failures.length) {
  console.error('Missing top-of-file intent comments in:');
  failures.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log('All first-party source files contain file-overview comments or generated headers.');
