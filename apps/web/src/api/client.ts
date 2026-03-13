import type { AuthUser, Product } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error ?? 'Request failed');
  }
  return json as T;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const payload = await request<{ ok: true; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return payload.user;
}

export async function me(): Promise<AuthUser> {
  const payload = await request<{ ok: true; user: AuthUser }>('/auth/me');
  return payload.user;
}

export async function logout(): Promise<void> {
  await request<{ ok: true }>('/auth/logout', { method: 'POST' });
}

export async function listProducts(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return request<{ ok: true; data: { items: Product[]; meta: { total: number; limit: number; offset: number } } }>(`/catalog/products?${search.toString()}`);
}

export async function getProduct(productId: string) {
  return request<{ ok: true; data: Product }>(`/catalog/products/${encodeURIComponent(productId)}`);
}

export async function getRelated(productId: string) {
  return request<{ ok: true; data: Product[] }>(`/catalog/products/${encodeURIComponent(productId)}/related`);
}
