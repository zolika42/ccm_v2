/**
 * @fileoverview Generates searchable HTML code-reference pages with file-level and symbol-level views for frontend, backend, and tooling sources.
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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function buildLineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

function indexToLine(starts, index) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (starts[mid] <= index && (mid === starts.length - 1 || starts[mid + 1] > index)) {
      return mid + 1;
    }
    if (starts[mid] > index) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return 1;
}

function extractFileOverview(text) {
  const blockMatch = text.match(/\/\*\*([\s\S]*?)\*\//);
  if (blockMatch) {
    const lines = normalizeDocLines(blockMatch[1]);
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

function normalizeDocLines(blockBody) {
  return blockBody
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean);
}

function summarizeDocLines(lines) {
  return lines
    .filter((line) => !line.startsWith('@fileoverview'))
    .filter((line) => !line.startsWith('@param'))
    .filter((line) => !line.startsWith('@return'))
    .filter((line) => !line.startsWith('@returns'))
    .filter((line) => !line.startsWith('@throws'))
    .filter((line) => !line.startsWith('@type'))
    .filter((line) => !line.startsWith('@property'))
    .join(' ')
    .trim();
}

function extractCommentHighlights(text) {
  const highlights = [];
  const docBlockRegex = /\/\*\*([\s\S]*?)\*\//g;
  let match;

  while ((match = docBlockRegex.exec(text)) !== null) {
    const joined = summarizeDocLines(normalizeDocLines(match[1]));
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

  return [...new Set(dependencies)].slice(0, 12);
}

function extractGenericSymbols(text, ext) {
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

  return [...new Set(found)].slice(0, 20);
}


function declarationPatterns(ext) {
  if (ext === '.php') {
    return [
      /^(?:final\s+|abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
      /^interface\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
      /^trait\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
      /^(?:public|protected|private)?\s*(?:static\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm,
    ];
  }
  if (ext === '.sh') {
    return [/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/gm];
  }
  return [
    /^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
    /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm,
    /^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/gm,
    /^const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/gm,
  ];
}

function symbolKindFromDeclaration(ext, declaration) {
  const details = declarationDetails(ext, declaration);
  return details?.kind ?? 'symbol';
}

function nearestLineComment(lines, lineIndex) {
  const collected = [];
  for (let i = lineIndex - 1; i >= 0; i -= 1) {
    const candidate = lines[i].trim();
    if (candidate.startsWith('//')) {
      collected.unshift(candidate.replace(/^\/\/\s?/, ''));
      continue;
    }
    if (candidate.startsWith('#') && !candidate.startsWith('#!')) {
      collected.unshift(candidate.replace(/^#\s?/, ''));
      continue;
    }
    if (candidate === '') continue;
    break;
  }
  return collected.join(' ').trim();
}

function mergeSymbolRecords(symbols, fallbackSymbols) {
  const existing = new Set(symbols.map((symbol) => `${symbol.kind}:${symbol.name}:${symbol.line}`));
  const merged = [...symbols];
  for (const symbol of fallbackSymbols) {
    const key = `${symbol.kind}:${symbol.name}:${symbol.line}`;
    if (!existing.has(key)) {
      existing.add(key);
      merged.push(symbol);
    }
  }
  return merged.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
}

function findFallbackSymbols(text, ext, relativePath, fileOverview) {
  const starts = buildLineIndex(text);
  const lines = text.split(/\r?\n/);
  const found = [];

  for (const pattern of declarationPatterns(ext)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const declaration = match[0].trim();
      const details = declarationDetails(ext, declaration);
      if (!details) continue;
      const line = indexToLine(starts, match.index);
      const lineComment = nearestLineComment(lines, line - 1);
      found.push({
        id: `${slugify(relativePath)}-${slugify(details.name)}`,
        kind: details.kind,
        name: details.name,
        signature: details.signature,
        summary: lineComment || `No dedicated symbol docblock found; inherits file intent: ${fileOverview}`,
        tags: [],
        line,
      });
    }
  }

  return found;
}

function parseDocBlockDetails(blockBody) {
  const lines = normalizeDocLines(blockBody);
  const summary = summarizeDocLines(lines) || 'No descriptive summary was found for this symbol.';
  const tags = [];
  for (const line of lines) {
    const tagMatch = line.match(/^@([a-zA-Z]+)\s*(.*)$/);
    if (tagMatch && tagMatch[1] !== 'fileoverview') {
      tags.push({ name: tagMatch[1], value: tagMatch[2].trim() });
    }
  }
  return { summary, tags, rawLines: lines };
}

function declarationDetails(ext, declaration) {
  const text = declaration.trim();
  if (ext === '.php') {
    let match = text.match(/^(?:final\s+|abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (match) return { kind: 'class', name: match[1], signature: match[0] };
    match = text.match(/^interface\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (match) return { kind: 'interface', name: match[1], signature: match[0] };
    match = text.match(/^trait\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (match) return { kind: 'trait', name: match[1], signature: match[0] };
    match = text.match(/^(?:public|protected|private)?\s*(?:static\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (match) return { kind: 'function', name: match[1], signature: text.replace(/\s+/g, ' ') };
  }

  if (ext === '.sh') {
    const match = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/);
    if (match) return { kind: 'function', name: match[1], signature: match[0] };
  }

  let match = text.match(/^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  if (match) return { kind: 'class', name: match[1], signature: match[0] };
  match = text.match(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
  if (match) return { kind: 'function', name: match[1], signature: text.replace(/\s+/g, ' ') };
  match = text.match(/^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (match) return { kind: 'const', name: match[1], signature: text.replace(/\s+/g, ' ') };
  match = text.match(/^const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (match) return { kind: 'const', name: match[1], signature: text.replace(/\s+/g, ' ') };

  return null;
}

function findDocSymbols(text, ext, relativePath) {
  const starts = buildLineIndex(text);
  const symbols = [];

  if (ext === '.sh') {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const functionMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/);
      if (!functionMatch) continue;
      const commentLines = [];
      for (let j = i - 1; j >= 0; j -= 1) {
        const candidate = lines[j].trim();
        if (candidate.startsWith('#') && !candidate.startsWith('#!')) {
          commentLines.unshift(candidate.replace(/^#\s?/, ''));
          continue;
        }
        if (candidate === '') continue;
        break;
      }
      const summary = commentLines.join(' ').trim() || 'No nearby shell comment was found for this function.';
      symbols.push({
        id: `${slugify(relativePath)}-${slugify(functionMatch[1])}`,
        kind: 'function',
        name: functionMatch[1],
        signature: line.trim(),
        summary,
        tags: [],
        line: i + 1,
      });
    }
    return symbols;
  }

  const docRegex = /\/\*\*([\s\S]*?)\*\//g;
  let match;
  while ((match = docRegex.exec(text)) !== null) {
    const blockEnd = match.index + match[0].length;
    const tail = text.slice(blockEnd, blockEnd + 600);
    const declarationMatch = tail.match(/^\s*(?:\/\/.*\n\s*)*(?:\/\*[^]*?\*\/\s*)*([^{\n;]+(?:\{|=>|\n))/);
    if (!declarationMatch) continue;

    const declaration = declarationMatch[1].trim();
    const details = declarationDetails(ext, declaration);
    if (!details) continue;
    if (details.name === 'render' && relativePath.endsWith('main.tsx')) continue;

    const docDetails = parseDocBlockDetails(match[1]);
    symbols.push({
      id: `${slugify(relativePath)}-${slugify(details.name)}`,
      kind: details.kind,
      name: details.name,
      signature: details.signature,
      summary: docDetails.summary,
      tags: docDetails.tags,
      line: indexToLine(starts, blockEnd),
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const symbol of symbols) {
    const key = `${symbol.kind}:${symbol.name}:${symbol.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(symbol);
    }
  }
  return deduped;
}

function collectEntries(section) {
  const files = section.roots.flatMap((relativeRoot) => {
    const absolute = path.join(root, relativeRoot);
    return fs.existsSync(absolute) ? walk(absolute) : [];
  });

  return files.map((filePath) => {
    const text = readText(filePath);
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath);
    const relativePath = path.relative(root, filePath).replaceAll('\\', '/');
    const overview = extractFileOverview(text);
    const symbols = mergeSymbolRecords(
      findDocSymbols(text, ext, relativePath),
      findFallbackSymbols(text, ext, relativePath, overview),
    );
    return {
      relativePath,
      slug: slugify(relativePath),
      overview,
      highlights: extractCommentHighlights(text),
      symbols,
      genericSymbols: extractGenericSymbols(text, ext),
      dependencies: extractDependencies(text, ext),
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

function renderSymbolTag(tag) {
  return `<li><code>@${escapeHtml(tag.name)}</code> ${escapeHtml(tag.value)}</li>`;
}

function renderSymbol(symbol) {
  return `
    <section class="symbol-card searchable" id="${escapeHtml(symbol.id)}" data-search="${escapeHtml(`${symbol.kind} ${symbol.name} ${symbol.summary} ${symbol.signature} ${symbol.tags.map((tag) => `${tag.name} ${tag.value}`).join(' ')}`)}">
      <div class="symbol-head">
        <div>
          <p class="eyebrow">${escapeHtml(symbol.kind)} · line ${symbol.line}</p>
          <h4><code>${escapeHtml(symbol.name)}</code></h4>
        </div>
        <a class="anchor-link" href="#${escapeHtml(symbol.id)}">#</a>
      </div>
      <p class="symbol-signature"><code>${escapeHtml(symbol.signature)}</code></p>
      <p class="overview">${escapeHtml(symbol.summary)}</p>
      ${symbol.tags.length ? `<details class="tags-block"><summary>Doc tags</summary><ul>${symbol.tags.map(renderSymbolTag).join('')}</ul></details>` : ''}
    </section>`;
}

function renderSidebar(section, groups) {
  return `
    <aside class="sidebar">
      <div class="sidebar-panel sticky">
        <h2>${escapeHtml(section.title)}</h2>
        <p class="muted small">Jump through files and documented symbols without opening the source tree.</p>
        <input id="page-search" class="search-input" type="search" placeholder="Search files, symbols, comments..." autocomplete="off" />
        <nav class="sidebar-nav">
          ${groups.map(([groupName, groupEntries]) => `
            <section class="sidebar-group">
              <h3>${escapeHtml(groupName)}</h3>
              <ul>
                ${groupEntries.map((entry) => `
                  <li>
                    <a href="#${escapeHtml(entry.slug)}">${escapeHtml(path.basename(entry.relativePath))}</a>
                    ${entry.symbols.length ? `<ul class="symbol-list">${entry.symbols.map((symbol) => `<li><a href="#${escapeHtml(symbol.id)}">${escapeHtml(symbol.name)}</a></li>`).join('')}</ul>` : ''}
                  </li>`).join('')}
              </ul>
            </section>`).join('')}
        </nav>
      </div>
    </aside>`;
}

function renderSection(section, entries) {
  const groups = groupEntries(entries);
  const content = groups.length
    ? groups.map(([groupName, groupEntries]) => `
      <section class="group searchable" data-search="${escapeHtml(groupName)}">
        <div class="group-head">
          <h2>${escapeHtml(groupName)}</h2>
          <span class="count-pill">${groupEntries.length} file(s)</span>
        </div>
        <div class="file-stack">
          ${groupEntries.map((entry) => `
            <article class="file-card searchable" id="${escapeHtml(entry.slug)}" data-search="${escapeHtml(`${entry.relativePath} ${entry.overview} ${entry.highlights.join(' ')} ${entry.genericSymbols.join(' ')} ${entry.dependencies.join(' ')}`)}">
              <div class="card-head">
                <div>
                  <p class="eyebrow">${escapeHtml(path.extname(entry.relativePath).replace('.', '').toUpperCase() || 'FILE')} · ${entry.sizeKb} KB</p>
                  <h3><code>${escapeHtml(entry.relativePath)}</code></h3>
                </div>
                <a class="anchor-link" href="#${escapeHtml(entry.slug)}">#</a>
              </div>
              <p class="overview">${escapeHtml(entry.overview)}</p>
              <div class="meta-grid">
                ${entry.genericSymbols.length ? `<p><strong>Detected symbols:</strong> ${entry.genericSymbols.map((symbol) => `<code>${escapeHtml(symbol)}</code>`).join(', ')}</p>` : ''}
                ${entry.dependencies.length ? `<p><strong>Dependencies:</strong> ${entry.dependencies.map((item) => `<code>${escapeHtml(item)}</code>`).join(', ')}</p>` : ''}
                <p class="muted tiny">Snapshot timestamp: ${escapeHtml(entry.lastModified)}</p>
              </div>
              <details>
                <summary>Comment highlights</summary>
                ${entry.highlights.length ? `<ul>${entry.highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join('')}</ul>` : '<p class="muted">No additional comment blocks were extracted from this file.</p>'}
              </details>
              <div class="symbol-section">
                <div class="symbol-section-head">
                  <h4>Documented symbols</h4>
                  <span class="count-pill">${entry.symbols.length}</span>
                </div>
                ${entry.symbols.length ? `<div class="symbol-grid">${entry.symbols.map(renderSymbol).join('')}</div>` : '<p class="muted">No class/function-level doc block was paired with a declaration in this file yet.</p>'}
              </div>
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
        --panel-soft: rgba(30, 41, 59, 0.86);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --accent: #60a5fa;
        --accent-soft: rgba(96, 165, 250, 0.16);
        --border: rgba(148, 163, 184, 0.24);
        --shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(180deg, #020617 0%, #111827 100%);
        color: var(--text);
      }
      a { color: var(--accent); text-decoration: none; }
      a:hover { text-decoration: underline; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }
      .page-shell { max-width: 1520px; margin: 0 auto; padding: 24px 20px 64px; }
      .hero, .group, .file-card, .sidebar-panel, .symbol-card {
        border: 1px solid var(--border);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: var(--shadow);
      }
      .hero { padding: 28px; margin-bottom: 24px; }
      .hero h1 { margin: 0 0 10px; font-size: clamp(2rem, 4vw, 2.8rem); }
      .hero p { margin: 0 0 12px; line-height: 1.6; color: var(--muted); }
      .nav-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
      .nav-pill {
        display: inline-flex; align-items: center; justify-content: center; text-decoration: none;
        border-radius: 999px; border: 1px solid var(--border); padding: 8px 12px; background: rgba(30, 41, 59, 0.8);
      }
      .nav-pill.active { background: var(--accent-soft); color: #dbeafe; }
      .layout { display: grid; grid-template-columns: minmax(260px, 320px) minmax(0, 1fr); gap: 24px; align-items: start; }
      .sticky { position: sticky; top: 24px; }
      .sidebar-panel { padding: 20px; }
      .sidebar-panel h2 { margin: 0 0 8px; }
      .small { font-size: 0.92rem; }
      .search-input {
        width: 100%; margin: 14px 0 18px; padding: 12px 14px; border-radius: 14px;
        border: 1px solid var(--border); background: rgba(2, 6, 23, 0.65); color: var(--text);
      }
      .sidebar-nav { max-height: calc(100vh - 220px); overflow: auto; padding-right: 6px; }
      .sidebar-group + .sidebar-group { margin-top: 18px; }
      .sidebar-group h3 { margin: 0 0 8px; font-size: 0.95rem; color: #bfdbfe; }
      .sidebar-group ul { margin: 0; padding-left: 18px; line-height: 1.45; }
      .symbol-list { margin-top: 6px; }
      .content { display: grid; gap: 24px; }
      .group { padding: 20px; }
      .group-head, .card-head, .symbol-head, .symbol-section-head {
        display: flex; align-items: start; justify-content: space-between; gap: 12px;
      }
      .group h2, .file-card h3, .symbol-card h4 { margin: 0; }
      .file-stack { display: grid; gap: 18px; margin-top: 16px; }
      .file-card { padding: 20px; background: var(--panel-strong); }
      .overview { line-height: 1.6; }
      .meta-grid { display: grid; gap: 8px; margin: 14px 0; }
      .count-pill {
        display: inline-flex; align-items: center; justify-content: center; padding: 4px 10px; border-radius: 999px;
        background: var(--accent-soft); color: #bfdbfe; font-size: 0.85rem;
      }
      .muted { color: var(--muted); }
      .tiny { font-size: 0.8rem; }
      .eyebrow { margin: 0 0 6px; color: #93c5fd; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; }
      details { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 12px; }
      summary { cursor: pointer; }
      .symbol-section { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px; }
      .symbol-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-top: 14px; }
      .symbol-card { background: var(--panel-soft); padding: 16px; }
      .symbol-signature { margin: 10px 0; padding: 10px 12px; border-radius: 14px; background: rgba(2, 6, 23, 0.5); overflow: auto; }
      .anchor-link {
        display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;
        border-radius: 999px; border: 1px solid var(--border); background: rgba(2, 6, 23, 0.45);
      }
      .tags-block ul { padding-left: 18px; line-height: 1.5; }
      .is-hidden { display: none !important; }
      @media (max-width: 980px) {
        .layout { grid-template-columns: 1fr; }
        .sticky { position: static; }
        .sidebar-nav { max-height: none; }
      }
    </style>
  </head>
  <body>
    <main class="page-shell">
      <section class="hero">
        <h1>${escapeHtml(section.title)}</h1>
        <p>${escapeHtml(section.description)}</p>
        <p class="muted">Generated automatically by <code>scripts/docs/generate-code-reference.mjs</code>. Use the search box to filter files and documented symbols on this page.</p>
        <div class="nav-row">
          <a class="nav-pill" href="./index.html">Index</a>
          ${sectionNavigation(section.key)}
        </div>
      </section>
      <div class="layout">
        ${renderSidebar(section, groups)}
        <div class="content" id="search-scope">
          ${content}
        </div>
      </div>
    </main>
    <script>
      const searchInput = document.getElementById('page-search');
      const searchable = Array.from(document.querySelectorAll('.searchable'));
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.trim().toLowerCase();
          searchable.forEach((element) => {
            const haystack = (element.getAttribute('data-search') || '').toLowerCase();
            element.classList.toggle('is-hidden', query && !haystack.includes(query));
          });
        });
      }
    </script>
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
        --panel-strong: rgba(17, 24, 39, 0.94);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --accent: #60a5fa;
        --border: rgba(148, 163, 184, 0.24);
        --shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        background: linear-gradient(180deg, #020617 0%, #111827 100%);
        color: var(--text);
      }
      a { color: inherit; text-decoration: none; }
      .shell { max-width: 1200px; margin: 0 auto; padding: 32px 20px 64px; }
      .hero, .summary-card {
        border: 1px solid var(--border);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: var(--shadow);
      }
      .hero { padding: 28px; }
      .hero h1 { margin: 0 0 10px; font-size: clamp(2rem, 4vw, 2.8rem); }
      .hero p { margin: 0 0 10px; line-height: 1.6; color: var(--muted); }
      .grid { margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
      .summary-card { padding: 20px; background: var(--panel-strong); }
      .summary-card h2 { margin: 0 0 10px; }
      .summary-card p { line-height: 1.6; color: var(--muted); }
      .meta-list { margin: 14px 0 0; padding-left: 18px; color: var(--muted); }
      .tag { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 4px 10px; background: rgba(96, 165, 250, 0.16); color: #bfdbfe; }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <h1>Code Reference Index</h1>
        <p>Browsable HTML documentation generated from first-party source comments. Each section now includes a symbol-level view, clickable sidebar navigation, and in-page search.</p>
        <p class="muted">Regenerate with <code>make docs</code> or <code>cd apps/web && npm install</code>.</p>
      </section>
      <section class="grid">
        ${summaries.map((summary) => `
          <a class="summary-card" href="./${summary.key}.html">
            <span class="tag">${summary.fileCount} files · ${summary.symbolCount} documented symbols</span>
            <h2>${escapeHtml(summary.title)}</h2>
            <p>${escapeHtml(summary.description)}</p>
            <ul class="meta-list">
              ${summary.roots.map((rootEntry) => `<li><code>${escapeHtml(rootEntry)}</code></li>`).join('')}
            </ul>
          </a>`).join('')}
      </section>
    </main>
  </body>
</html>`;
}

ensureDir(outputDir);

const sectionSummaries = [];
for (const section of sections) {
  const entries = collectEntries(section);
  const html = renderSection(section, entries);
  const outputPath = path.join(outputDir, `${section.key}.html`);
  fs.writeFileSync(outputPath, html);
  sectionSummaries.push({
    key: section.key,
    title: section.title,
    description: section.description,
    roots: section.roots,
    fileCount: entries.length,
    symbolCount: entries.reduce((sum, entry) => sum + entry.symbols.length, 0),
  });
  console.log(`Generated ${path.relative(root, outputPath)}`);
}

const indexPath = path.join(outputDir, 'index.html');
fs.writeFileSync(indexPath, renderIndex(sectionSummaries));
console.log(`Generated ${path.relative(root, indexPath)}`);
