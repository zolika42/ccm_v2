/**
 * @fileoverview Generates a browsable HTML code reference from top-of-file source comments so frontend/backend intent is easy to inspect without opening every source file manually.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const outputDir = path.join(root, 'docs/code-reference');

const sections = [
  {
    key: 'backend',
    title: 'Backend Code Reference',
    description: 'PHP entrypoints, API support code, and backend-facing project scripts.',
    roots: ['apps/api/public', 'apps/api/src'],
  },
  {
    key: 'frontend',
    title: 'Frontend Code Reference',
    description: 'React/web API client code, runtime adapters, and frontend support scripts.',
    roots: ['apps/web/src', 'apps/web/scripts'],
  },
  {
    key: 'tooling',
    title: 'Tooling Code Reference',
    description: 'Restore/smoke/documentation automation that keeps the developer workflow reproducible.',
    roots: ['scripts/db', 'scripts/docs'],
  },
];

const allowedExtensions = new Set(['.php', '.ts', '.tsx', '.mjs', '.sh']);

function walk(dirPath) {
  const files = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__MACOSX' || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (allowedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractFileOverview(text) {
  const blockMatch = text.match(/\/\*\*([\s\S]*?)\*\//);
  if (blockMatch) {
    const lines = blockMatch[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter(Boolean);
    const overviewIndex = lines.findIndex((line) => line.startsWith('@fileoverview'));
    if (overviewIndex >= 0) {
      const firstLine = lines[overviewIndex].replace('@fileoverview', '').trim();
      const remainder = lines.slice(overviewIndex + 1).filter((line) => !line.startsWith('@'));
      return [firstLine, ...remainder].join(' ').trim();
    }

    const generatedHeader = lines.find((line) => line.includes('AUTO-GENERATED FILE'));
    if (generatedHeader) {
      return generatedHeader;
    }
  }

  const shellMatch = text.match(/^#\s*@fileoverview\s+(.+)$/m);
  if (shellMatch) {
    return shellMatch[1].trim();
  }

  return 'No @fileoverview comment found in this file.';
}

function extractCommentHighlights(text) {
  const highlights = [];
  const docBlockRegex = /\/\*\*([\s\S]*?)\*\//g;
  let match;

  while ((match = docBlockRegex.exec(text)) !== null) {
    const joined = match[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('@fileoverview'))
      .filter((line) => !line.startsWith('@param'))
      .filter((line) => !line.startsWith('@return'))
      .filter((line) => !line.startsWith('@throws'))
      .join(' ')
      .trim();

    if (joined) {
      highlights.push(joined);
    }
  }

  const shellCommentRegex = /^#\s+(?!\!)(?!@fileoverview)(.+)$/gm;
  while ((match = shellCommentRegex.exec(text)) !== null) {
    const line = match[1].trim();
    if (line) {
      highlights.push(line);
    }
  }

  return [...new Set(highlights)].slice(0, 6);
}

function extractSymbols(text, ext) {
  const patterns = {
    '.php': [
      /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)/g,
      /\binterface\s+([A-Za-z_][A-Za-z0-9_]*)/g,
      /\btrait\s+([A-Za-z_][A-Za-z0-9_]*)/g,
      /\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
    ],
    '.ts': [
      /export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
      /export\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/g,
      /export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g,
      /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
    ],
    '.tsx': [
      /export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
      /export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g,
      /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
    ],
    '.mjs': [
      /export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
      /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g,
      /const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(/g,
    ],
    '.sh': [
      /^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/gm,
    ],
  };

  const found = [];
  for (const pattern of patterns[ext] ?? []) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      found.push(match[1]);
    }
  }

  return [...new Set(found)].slice(0, 12);
}

function extractDependencies(text, ext) {
  const dependencies = [];
  if (ext === '.php') {
    const useRegex = /^use\s+([^;]+);/gm;
    let match;
    while ((match = useRegex.exec(text)) !== null) {
      dependencies.push(match[1].trim());
    }
  } else {
    const importRegex = /^import\s+.+?from\s+['"]([^'"]+)['"];?$/gm;
    let match;
    while ((match = importRegex.exec(text)) !== null) {
      dependencies.push(match[1].trim());
    }
  }

  return [...new Set(dependencies)].slice(0, 10);
}

function collectEntries(section) {
  const files = section.roots.flatMap((relativeRoot) => {
    const absolute = path.join(root, relativeRoot);
    return fs.existsSync(absolute) ? walk(absolute) : [];
  });

  return files.map((filePath) => {
    const text = readText(filePath);
    const stats = fs.statSync(filePath);
    return {
      relativePath: path.relative(root, filePath).replaceAll('\\', '/'),
      overview: extractFileOverview(text),
      highlights: extractCommentHighlights(text),
      symbols: extractSymbols(text, path.extname(filePath)),
      dependencies: extractDependencies(text, path.extname(filePath)),
      lastModified: stats.mtime.toISOString(),
      sizeKb: (stats.size / 1024).toFixed(1),
    };
  });
}

function groupEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const group = path.dirname(entry.relativePath);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group).push(entry);
  }

  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function sectionNavigation(activeKey) {
  return sections
    .map((section) => section.key === activeKey
      ? `<span class="nav-pill active">${escapeHtml(section.title)}</span>`
      : `<a class="nav-pill" href="./${section.key}.html">${escapeHtml(section.title)}</a>`)
    .join('');
}

function renderSection(section, entries) {
  const groups = groupEntries(entries);
  const cards = groups.length
    ? groups.map(([groupName, groupEntries]) => `
      <section class="group">
        <div class="group-head">
          <h2>${escapeHtml(groupName)}</h2>
          <span class="count-pill">${groupEntries.length} file(s)</span>
        </div>
        <div class="card-grid">
          ${groupEntries.map((entry) => `
            <article class="card">
              <div class="card-head">
                <h3><code>${escapeHtml(entry.relativePath)}</code></h3>
                <span class="count-pill">${entry.sizeKb} KB</span>
              </div>
              <p class="overview">${escapeHtml(entry.overview)}</p>
              ${entry.symbols.length ? `<p><strong>Declared symbols:</strong> ${entry.symbols.map((symbol) => `<code>${escapeHtml(symbol)}</code>`).join(', ')}</p>` : ''}
              ${entry.dependencies.length ? `<p><strong>Dependencies:</strong> ${entry.dependencies.map((item) => `<code>${escapeHtml(item)}</code>`).join(', ')}</p>` : ''}
              <details>
                <summary>Comment highlights</summary>
                ${entry.highlights.length ? `<ul>${entry.highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join('')}</ul>` : '<p class="muted">No additional comment blocks were extracted from this file.</p>'}
              </details>
              <p class="muted tiny">Snapshot timestamp: ${escapeHtml(entry.lastModified)}</p>
            </article>`).join('')}
        </div>
      </section>`).join('')
    : '<section class="group"><p class="muted">No matching first-party source files were found for this section in the current snapshot.</p></section>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(section.title)}</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #020617;
        --panel: rgba(15, 23, 42, 0.92);
        --panel-strong: rgba(17, 24, 39, 0.94);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --accent: #60a5fa;
        --border: rgba(148, 163, 184, 0.24);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #020617 0%, #111827 100%);
        color: var(--text);
      }
      a { color: var(--accent); }
      .shell { max-width: 1280px; margin: 0 auto; padding: 32px 20px 64px; }
      .hero, .group, .card {
        border: 1px solid var(--border);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
      }
      .hero { padding: 28px; }
      .hero h1 { margin: 0 0 10px; font-size: 2rem; }
      .hero p { margin: 0 0 10px; line-height: 1.6; color: var(--muted); }
      .nav-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
      .nav-pill {
        display: inline-flex; align-items: center; justify-content: center; text-decoration: none;
        border-radius: 999px; border: 1px solid var(--border); padding: 8px 12px; background: rgba(30, 41, 59, 0.8);
      }
      .nav-pill.active { background: rgba(96, 165, 250, 0.16); color: #dbeafe; }
      .group { margin-top: 24px; padding: 20px; }
      .group-head, .card-head {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
      }
      .card-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-top: 16px;
      }
      .card { background: var(--panel-strong); padding: 18px; }
      .card h3, .group h2 { margin: 0; }
      .overview { line-height: 1.6; }
      .count-pill {
        display: inline-flex; align-items: center; justify-content: center; padding: 4px 10px; border-radius: 999px;
        background: rgba(96, 165, 250, 0.15); color: #bfdbfe; font-size: 0.85rem;
      }
      .muted { color: var(--muted); }
      .tiny { font-size: 0.8rem; }
      details { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 12px; }
      summary { cursor: pointer; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      ul { padding-left: 18px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <h1>${escapeHtml(section.title)}</h1>
        <p>${escapeHtml(section.description)}</p>
        <p class="muted">Generated automatically by <code>scripts/docs/generate-code-reference.mjs</code>.</p>
        <div class="nav-row">
          <a class="nav-pill" href="./index.html">Index</a>
          ${sectionNavigation(section.key)}
        </div>
      </section>
      ${cards}
    </main>
  </body>
</html>`;
}

function renderIndex(summaries) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Code Reference Index</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #020617;
        --panel: rgba(15, 23, 42, 0.92);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --border: rgba(148, 163, 184, 0.24);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        background: radial-gradient(circle at top, #111827 0%, #020617 70%);
        color: var(--text);
      }
      .shell { max-width: 1120px; margin: 0 auto; padding: 40px 20px 64px; }
      .hero, .card {
        border: 1px solid var(--border); border-radius: 24px; background: var(--panel); box-shadow: 0 18px 40px rgba(0,0,0,0.22);
      }
      .hero { padding: 28px; }
      .hero h1 { margin: 0 0 12px; font-size: 2.1rem; }
      .hero p { margin: 0 0 10px; color: var(--muted); line-height: 1.6; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 18px; margin-top: 24px; }
      .card { display: block; text-decoration: none; color: inherit; padding: 20px; }
      .card:hover { transform: translateY(-2px); }
      .meta { color: var(--muted); margin-top: 12px; }
      .tag { display: inline-flex; margin-top: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(96, 165, 250, 0.15); color: #bfdbfe; }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <h1>Code Reference</h1>
        <p>This HTML reference is generated from source comments and file structure metadata so backend/frontend intent stays easy to browse.</p>
      </section>
      <section class="grid">
        ${summaries.map((summary) => `<a class="card" href="./${summary.key}.html"><h2>${escapeHtml(summary.title)}</h2><p>${escapeHtml(summary.description)}</p><div class="tag">${summary.fileCount} file(s)</div><div class="meta">${summary.commentCount} comment highlight(s)</div></a>`).join('')}
      </section>
    </main>
  </body>
</html>`;
}

fs.mkdirSync(outputDir, { recursive: true });
const summaries = [];
for (const section of sections) {
  const entries = collectEntries(section);
  fs.writeFileSync(path.join(outputDir, `${section.key}.html`), renderSection(section, entries));
  summaries.push({
    key: section.key,
    title: section.title,
    description: section.description,
    fileCount: entries.length,
    commentCount: entries.reduce((sum, entry) => sum + entry.highlights.length, 0),
  });
  console.log(`Generated docs/code-reference/${section.key}.html`);
}

fs.writeFileSync(path.join(outputDir, 'index.html'), renderIndex(summaries));
console.log('Generated docs/code-reference/index.html');
