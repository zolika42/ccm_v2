import type { AuthUser, Cart, CartIdentity, CartSummary, CheckoutDraft, CheckoutState, CheckoutSubmitResponse, LibraryState, Product } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';

type ApiSuccess<T> = {
  ok: true;
  data: T;
  identity?: CartIdentity;
};

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

export async function getCartIdentity() {
  return request<ApiSuccess<CartIdentity>>('/cart/identity');
}

export async function getCart() {
  return request<ApiSuccess<Cart>>('/cart');
}

export async function getCartSummary() {
  return request<ApiSuccess<CartSummary>>('/cart/summary');
}

export async function addCartItem(productId: string, quantity = 1) {
  return request<ApiSuccess<Cart>>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function updateCartItem(productId: string, quantity: number) {
  return request<ApiSuccess<Cart>>(`/cart/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(productId: string) {
  return request<ApiSuccess<Cart>>(`/cart/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}

export async function getCheckoutSummary() {
  return request<ApiSuccess<CheckoutState>>('/checkout/summary');
}

export async function validateCheckout(draft: Partial<CheckoutDraft>) {
  return request<ApiSuccess<CheckoutState>>('/checkout/validate', {
    method: 'POST',
    body: JSON.stringify(draft),
  });
}

export async function submitCheckout(draft: Partial<CheckoutDraft>) {
  const response = await fetch(`${API_BASE}/checkout/submit`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  });

  const json = await response.json();
  if (!response.ok && response.status !== 401 && response.status !== 422) {
    throw new Error(json?.error ?? 'Request failed');
  }

  return json as CheckoutSubmitResponse;
}


export async function getLibrary() {
  const response = await fetch(`${API_BASE}/library`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok && response.status !== 401) {
    throw new Error(json?.error ?? 'Request failed');
  }

  return json as { ok: boolean; data?: LibraryState; error?: string };
}
