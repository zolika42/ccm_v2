/**
 * @fileoverview Build-time generator that turns the OpenAPI contract into a typed frontend API client.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const specPath = path.resolve(__dirname, '../../api/public/openapi.yaml');
const outputPath = path.resolve(__dirname, '../src/api/generated.ts');

const operationConfig = {
  getHealth: { responseType: 'Record<string, unknown>' },
  getOpenapi: { responseType: 'string', rawText: true },
  login: { responseType: '{ user: AuthUser }', bodyType: '{ email: string; password: string }' },
  logout: { responseType: '{ loggedOut: boolean }' },
  me: { responseType: '{ user: AuthUser }' },
  listProducts: {
    responseType: '{ items: Product[]; meta: { total: number; limit: number; offset: number } }',
    queryType: '{ limit?: number; offset?: number; q?: string; category?: string; sub_category?: string }',
  },
  getProduct: { responseType: 'Product', pathParams: [{ name: 'productId', type: 'string' }] },
  getRelatedProducts: { responseType: 'Product[]', pathParams: [{ name: 'productId', type: 'string' }] },
  getCartIdentity: { responseType: 'CartIdentity' },
  getCart: { responseType: 'Cart' },
  getCartSummary: { responseType: 'CartSummary' },
  addCartItem: { responseType: 'Cart', bodyType: '{ productId: string; quantity: number }' },
  updateCartItem: {
    responseType: 'Cart',
    pathParams: [{ name: 'productId', type: 'string' }],
    bodyType: '{ quantity: number }',
  },
  removeCartItem: { responseType: 'Cart', pathParams: [{ name: 'productId', type: 'string' }] },
  getCheckoutSummary: { responseType: 'CheckoutState' },
  validateCheckout: { responseType: 'CheckoutState', bodyType: 'Partial<CheckoutDraft>' },
  submitCheckout: {
    responseType: '{ checkout: CheckoutState; submission: CheckoutSubmission | null }',
    bodyType: 'Partial<CheckoutDraft>',
    allowStatuses: [401, 422],
  },
  getLibrary: { responseType: 'LibraryState', allowStatuses: [401] },
};

function parseOperations(yaml) {
  const operations = [];
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

    const methodMatch = line.match(/^    (get|post|patch|delete):\s*$/);
    if (methodMatch && currentPath) {
      currentMethod = methodMatch[1].toUpperCase();
      continue;
    }

    const opMatch = line.match(/^      operationId: ([A-Za-z0-9_]+)\s*$/);
    if (opMatch && currentPath && currentMethod) {
      operations.push({ operationId: opMatch[1], path: currentPath, method: currentMethod });
    }
  }

  return operations;
}

function interpolatePath(pathTemplate, pathParams) {
  return `\`${pathTemplate.replace(/\{([^}]+)\}/g, (_, name) => `\${encodeURIComponent(${name})}`)}\``;
}

function buildMethod(operation) {
  const config = operationConfig[operation.operationId];
  if (!config) {
    throw new Error(`Missing generator config for operationId ${operation.operationId}`);
  }

  const pathParams = config.pathParams ?? [];
  const args = [];
  for (const param of pathParams) args.push(`${param.name}: ${param.type}`);
  if (config.queryType) args.push(`query: ${config.queryType} = {}`);
  if (config.bodyType) args.push(`body: ${config.bodyType}`);
  args.push('options: RequestOptions = {}');

  const pathExpr = interpolatePath(operation.path, pathParams);
  const requestArgs = [];
  if (config.queryType) requestArgs.push('query');
  if (config.bodyType) requestArgs.push('body');
  requestArgs.push(`options: ${config.allowStatuses ? `{ ...options, allowStatuses: [${config.allowStatuses.join(', ')}] }` : 'options'}`);

  if (config.rawText) {
    return `  async ${operation.operationId}(${args.join(', ')}): Promise<${config.responseType}> {\n    return requestText('${operation.method}', ${pathExpr}, { ${requestArgs.join(', ')} });\n  }`;
  }

  return `  async ${operation.operationId}(${args.join(', ')}): Promise<ApiEnvelope<${config.responseType}>> {\n    return requestEnvelope<${config.responseType}>('${operation.method}', ${pathExpr}, { ${requestArgs.join(', ')} });\n  }`;
}

const yaml = fs.readFileSync(specPath, 'utf8');
const operations = parseOperations(yaml);
if (!operations.length) {
  throw new Error(`No operationIds parsed from ${specPath}`);
}

const missing = operations.filter((op) => !operationConfig[op.operationId]).map((op) => op.operationId);
if (missing.length) {
  throw new Error(`Missing generator config for: ${missing.join(', ')}`);
}

const methods = operations.map(buildMethod).join('\n\n');

const content = `/* eslint-disable */
/**
 * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
 * Source: apps/api/public/openapi.yaml
 * Generator: apps/web/scripts/generate-api-client.mjs
 */
import type {
  ApiEnvelope,
  AuthUser,
  Cart,
  CartIdentity,
  CartSummary,
  CheckoutDraft,
  CheckoutState,
  CheckoutSubmission,
  LibraryState,
  Product,
} from '../types';
import { requestEnvelope, requestText, type RequestOptions } from './runtime';

export class GeneratedApiClient {
${methods}
}

export const generatedApiClient = new GeneratedApiClient();
`;

fs.writeFileSync(outputPath, content);
console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
