/**
 * @fileoverview Shared fetch/runtime helpers used by the generated and ergonomic frontend API clients.
 */
import type { ApiEnvelope } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  headers?: HeadersInit;
  allowStatuses?: number[];
};

function buildUrl(path: string, query?: QueryParams) {
  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export function extractErrorMessage(json: { error?: { message?: string } } | null | undefined) {
  return json?.error?.message ?? 'Request failed';
}

function buildInit(method: string, body: unknown, options?: RequestOptions): RequestInit {
  return {
    credentials: 'include',
    ...options,
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options?.headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

export async function requestEnvelope<T>(
  method: string,
  path: string,
  args: {
    query?: QueryParams;
    body?: unknown;
    options?: RequestOptions;
  } = {},
): Promise<ApiEnvelope<T>> {
  const { query, body, options } = args;
  const allowStatuses = options?.allowStatuses ?? [];

  const response = await fetch(buildUrl(path, query), buildInit(method, body, options));
  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok && !allowStatuses.includes(response.status)) {
    throw new Error(extractErrorMessage(json));
  }

  return json;
}

export async function requestText(
  method: string,
  path: string,
  args: {
    query?: QueryParams;
    body?: unknown;
    options?: RequestOptions;
  } = {},
): Promise<string> {
  const { query, body, options } = args;
  const response = await fetch(buildUrl(path, query), buildInit(method, body, options));
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.text();
}
