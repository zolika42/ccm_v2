/**
 * @fileoverview Regenerates the developer handbook from the current repository state so docs stay aligned with the codebase.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

const makefilePath = path.join(root, 'Makefile');
const webPackagePath = path.join(root, 'apps/web/package.json');
const openapiPath = path.join(root, 'apps/api/public/openapi.yaml');
const handbookPath = path.join(root, 'docs/DEVELOPER_HANDBOOK.md');
const docsIndexPath = path.join(root, 'docs/README.md');
const supplementalDocs = [
  ['Legacy Domain Map', './legacy-domain-map.md'],
  ['Legacy Contract', './legacy-contract.md'],
  ['UI Parity Inventory', './ui-parity-inventory.md'],
  ['V1 Scope Freeze', './v1-scope-freeze.md'],
  ['Password Recovery Spike', './password-recovery-spike.md'],
  ['Download Security Review', './download-security-review.md'],
  ['Parity Checklist', './parity-checklist.md'],
  ['Fixture Kit', './fixture-kit.md'],
  ['Audit Log and Tracing', './audit-log-tracing.md'],
  ['UAT Script', './uat-script.md'],
  ['Cutover Readiness Checklist', './cutover-readiness-checklist.md'],
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseMakeTargets(makefile) {
  return makefile
    .split(/\r?\n/)
    .map((line) => line.match(/^([a-zA-Z0-9_-]+):/))
    .filter(Boolean)
    .map((match) => match[1])
    .filter((target, index, items) => !target.includes('%') && items.indexOf(target) === index && target !== '.PHONY');
}

function parseOpenapiEndpoints(yaml) {
  const endpoints = [];
  let currentPath = null;
  let currentMethod = null;

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, '    ');
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      currentMethod = null;
      continue;
    }

    const methodMatch = line.match(/^    (get|post|patch|delete):\s*$/i);
    if (methodMatch && currentPath) {
      currentMethod = methodMatch[1].toUpperCase();
      continue;
    }

    const opMatch = line.match(/^      operationId: ([A-Za-z0-9_]+)\s*$/);
    if (opMatch && currentPath && currentMethod) {
      endpoints.push({ method: currentMethod, path: currentPath, operationId: opMatch[1] });
    }
  }

  return endpoints;
}

function bulletList(items) {
  return items.map((item) => `- \`${item}\``).join('\n');
}

const makeTargets = parseMakeTargets(fs.readFileSync(makefilePath, 'utf8'));
const webPackage = readJson(webPackagePath);
const webScripts = Object.entries(webPackage.scripts ?? {}).map(([name, command]) => ({ name, command }));
const endpoints = parseOpenapiEndpoints(fs.readFileSync(openapiPath, 'utf8'));
const generatedAt = new Date().toISOString();

const handbook = `# Developer Handbook\n\n> Generated automatically by \`scripts/docs/generate-docs.mjs\`. Do not hand-edit this file; update the generator instead.\n> Generated at: ${generatedAt}\n\n## 1. What this repo is\n\nColumbiaGames Rewrite is a dual-stack application:\n- a native PHP API under \`apps/api\`\n- a React + TypeScript storefront under \`apps/web\`\n- two PostgreSQL databases:\n  - \`ccm\` = legacy cart/order/browser-state data\n  - \`columbia_games\` = store/customer/product/preorder data\n\nThe repo is designed to let developers work in three modes:\n1. Docker Compose (source of truth for the local stack)\n2. Native host workflow for fast iteration\n3. Legacy restore/verify/smoke workflow for validating the rewrite against production-like dumps\n\n## 2. Source-of-truth rules\n\n- **Docker Compose is the source of truth** for local runtime wiring.\n- **\`apps/api/public/openapi.yaml\` is the source of truth** for the frontend API client.\n- **\`scripts/docs/generate-docs.mjs\` is the source of truth** for this handbook.\n- **Generated files must be reproducible**:\n  - \`apps/web/src/api/generated.ts\` comes from \`npm run generate:api\`\n  - \`docs/DEVELOPER_HANDBOOK.md\` comes from \`node scripts/docs/generate-docs.mjs\`\n\n## 3. Repository map\n\n### Root\n- \`Makefile\` — common day-to-day commands\n- \`docker-compose.yml\` — local stack wiring\n- \`Project_plan.txt\` — original rewrite plan / backlog context\n- \`README.md\` — short entrypoint for humans\n- \`docs/\` — deeper technical and architecture documentation\n- \`scripts/db/\` — restore / verify / smoke helpers\n- \`scripts/docs/\` — doc generation and doc quality checks\n\n### API\n- \`apps/api/public/index.php\` — HTTP entrypoint and route registration\n- \`apps/api/src/Controllers\` — HTTP controller layer\n- \`apps/api/src/Services\` — use-case / orchestration layer\n- \`apps/api/src/Repositories\` — database access layer\n- \`apps/api/src/Support\` — routing, request, response, logging, cookie/session helpers\n\n### Web\n- \`apps/web/src/App.tsx\` — app shell and route table\n- \`apps/web/src/pages\` — page-level UI\n- \`apps/web/src/cart\` — cart context/state helpers\n- \`apps/web/src/api/client.ts\` — ergonomic wrapper used by pages/components\n- \`apps/web/src/api/generated.ts\` — generated typed client\n- \`apps/web/src/api/runtime.ts\` — fetch/runtime abstraction used by generated client\n- \`apps/web/scripts/generate-api-client.mjs\` — generator that reads the OpenAPI spec\n\n## 4. Prerequisites\n\n### Required\n- Docker + Docker Compose\n- Node.js 20+ for native frontend work\n- npm\n- PHP 8.2+ for native API work\n- PostgreSQL client tools for restore helpers (or use the Docker stack)\n\n### Nice to have\n- GNU Make\n- a working \`python3\` on the host for smoke helpers (the script now probes for a working interpreter automatically)\n\n## 5. First-time setup\n\n### Docker path (recommended)\n1. Start the stack:\n   - \`make up\`\n2. Restore the legacy dumps when you have them:\n   - \`make legacy-refresh CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz\`\n3. Open the app:\n   - Web: \`http://localhost:5173\`\n   - API: \`http://localhost:8080\`\n   - Health: \`http://localhost:8080/health\`\n   - OpenAPI: \`http://localhost:8080/openapi\`\n\n### Native path\n1. API:\n   - \`make native-api\`\n2. Web:\n   - \`make native-web\`\n3. Restore + verify + smoke when needed:\n   - \`make legacy-refresh CCM_DUMP=/abs/path/ccm.sql.gz STORE_DUMP=/abs/path/columbia_games.sql.gz\`\n\n## 6. Daily developer workflow\n\n### Common root commands\n${bulletList(makeTargets)}\n\n### Frontend commands\n${webScripts.map(({ name, command }) => `- \`${name}\` → \`${command}\``).join('\n')}\n\n### Recommended loop\n1. Pull latest code\n2. Run \`make up\` (or \`make native-api\` + \`make native-web\`)\n3. If schema-sensitive work changed, run \`make legacy-refresh ...\`\n4. If API contract changed, run:\n   - \`cd apps/web\`\n   - \`npm run generate:api\`\n   - \`npm run check:api-client\`\n5. Before shipping, run smoke again\n\n## 7. Architecture in plain language\n\n### API request flow\n1. \`apps/api/public/index.php\` parses the request and creates a request context\n2. \`Router\` matches the route\n3. A controller validates the HTTP shape\n4. A service runs the use case\n5. A repository talks to PostgreSQL\n6. \`JsonResponse\` returns the uniform envelope\n\n### Cart / checkout data flow\n- Browser identity lives in the legacy \`bid-cg\` cookie bridge\n- Active cart lives in the legacy \`ccm\` database using browser-state + EAV order/item rows\n- Customer/product/preorder information lives in \`columbia_games\`\n- Checkout submit bridges both worlds:\n  - reads legacy cart state from \`ccm\`\n  - persists order/customer effects in \`columbia_games\`\n  - clears the active browser cart after submit\n\n### Digital library\n- The library is built from store preorders joined with downloadable products\n- The API exposes this via \`GET /library\`\n- The frontend renders it at \`/library\`\n\n## 8. API contract and generated frontend client\n\nThe frontend must not hand-roll raw fetch calls for project endpoints anymore. The intended contract is:\n1. API shape lives in \`apps/api/public/openapi.yaml\`\n2. The generated frontend client is produced by \`apps/web/scripts/generate-api-client.mjs\`\n3. Pages/components call the wrapper in \`apps/web/src/api/client.ts\`\n\n### Current OpenAPI operations\n${endpoints.map((endpoint) => `- \`${endpoint.method} ${endpoint.path}\` → \`${endpoint.operationId}\``).join('\n')}\n\n### Rule of thumb\n- Change backend route/shape? Update OpenAPI first.\n- Change OpenAPI? Regenerate frontend client.\n- Generated files may be committed, but they must stay reproducible from the generator.\n\n## 9. Legacy data workflow\n\n### Restore\n- \`scripts/db/restore-legacy.sh\` recreates both legacy databases from dumps\n\n### Verify\n- \`scripts/db/verify-legacy.sh\` checks required tables/functions before app testing\n\n### Smoke\n- \`scripts/db/smoke-api.sh\` covers:\n  - health\n  - auth failure path\n  - catalog lookup\n  - cart read/write\n  - checkout summary/validate\n  - anonymous library protection\n  - optional authenticated purchase smoke\n\n## 10. Documentation workflow\n\n### Central rule\nDocumentation is part of the build surface, not an afterthought.\n\n### What must be kept up to date\n- \`README.md\` — short repo entrypoint\n- \`docs/DEVELOPER_HANDBOOK.md\` — central living handbook\n- \`docs/checkout-field-map.md\` — checkout mapping notes\n- \`docs/payment-flow-audit.md\` — payment flow findings\n- \`apps/api/public/openapi.yaml\` / \`docs/openapi.yaml\` — API contract\n\n### Automatic doc generation\n- \`npm install\` in \`apps/web\` triggers doc generation and doc comment verification\n- \`make docs\` regenerates docs manually\n- \`make docs-check\` verifies that first-party source files carry a file-overview comment\n\n## 11. Self-documenting code policy\n\nEvery first-party source file must explain its role at the top of the file with an \`@fileoverview\` comment (or an equivalent shell comment for bash scripts). Public entrypoints and adapters should prefer clear names over cleverness. When logic is non-obvious, add intent comments near the decision point instead of leaving tribal knowledge in chat history.\n\n## 12. Troubleshooting\n\n### White page in the frontend\n- Usually a runtime React/import error or a generated-client mismatch\n- Regenerate and rebuild:\n  - \`cd apps/web\`\n  - \`npm run check:api-client\`\n  - \`npm run build\`\n\n### Smoke fails on Python lookup\n- The smoke script probes for a working Python interpreter, but if the host PATH is unusual, run with:\n  - \`PYTHON_BIN=/usr/bin/python3 ./scripts/db/smoke-api.sh\`\n\n### Build fails after OpenAPI changes\n- Re-run \`npm run generate:api\`\n- Check whether \`apps/web/src/api/runtime.ts\` still exists\n- Check whether the OpenAPI operationId matches generator config\n\n### Docker web build fails after npm script changes\n- The web Dockerfile only works if the build context contains every file needed by npm lifecycle hooks\n- If doc generation or client generation scripts move, update \`apps/web/Dockerfile\` too\n\n## 13. Definition of done for future tickets\n\nA ticket is not done unless:\n- the code works\n- the relevant doc is updated\n- the OpenAPI spec is updated when the API changed\n- the frontend client is regenerated when the spec changed\n- smoke/typecheck/build still pass\n`;

const docsIndex = `# Docs Index

- [Developer Handbook](./DEVELOPER_HANDBOOK.md) — central setup, architecture, workflow, and troubleshooting guide
- [Checkout Field Map](./checkout-field-map.md) — checkout draft to legacy/store mapping notes
- [Payment Flow Audit](./payment-flow-audit.md) — payment behavior findings and open questions
- [OpenAPI Spec](./openapi.yaml) — published API contract snapshot
${supplementalDocs.map(([label, rel]) => `- [${label}](${rel})`).join('\n')}

This directory is intentionally treated as living project documentation. The handbook is regenerated from \`scripts/docs/generate-docs.mjs\`.
`;

fs.writeFileSync(handbookPath, handbook);
fs.writeFileSync(docsIndexPath, docsIndex);
console.log(`Generated ${path.relative(root, handbookPath)}`);
console.log(`Generated ${path.relative(root, docsIndexPath)}`);
