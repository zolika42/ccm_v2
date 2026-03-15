import type {
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

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';

type ApiMeta = {
  requestId: string;
  method: string;
  path: string;
  durationMs: number;
  identity?: CartIdentity;
};

type ApiError = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  meta: ApiMeta;
  error?: ApiError;
};

function extractErrorMessage(json: { error?: ApiError } | null | undefined) {
  return json?.error?.message ?? 'Request failed';
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(extractErrorMessage(json));
  }

  return json;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return payload.data.user;
}

export async function me(): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser }>('/auth/me');
  return payload.data.user;
}

export async function logout(): Promise<void> {
  await request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' });
}

export async function listProducts(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return request<{ items: Product[]; meta: { total: number; limit: number; offset: number } }>(`/catalog/products?${search.toString()}`);
}

export async function getProduct(productId: string) {
  return request<Product>(`/catalog/products/${encodeURIComponent(productId)}`);
}

export async function getRelated(productId: string) {
  return request<Product[]>(`/catalog/products/${encodeURIComponent(productId)}/related`);
}

export async function getCartIdentity() {
  return request<CartIdentity>('/cart/identity');
}

export async function getCart() {
  return request<Cart>('/cart');
}

export async function getCartSummary() {
  return request<CartSummary>('/cart/summary');
}

export async function addCartItem(productId: string, quantity = 1) {
  return request<Cart>('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function updateCartItem(productId: string, quantity: number) {
  return request<Cart>(`/cart/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(productId: string) {
  return request<Cart>(`/cart/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
}

export async function getCheckoutSummary() {
  return request<CheckoutState>('/checkout/summary');
}

export async function validateCheckout(draft: Partial<CheckoutDraft>) {
  return request<CheckoutState>('/checkout/validate', {
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

  const json = (await response.json()) as ApiEnvelope<{ checkout: CheckoutState; submission: CheckoutSubmission | null }>;
  if (!response.ok && response.status !== 401 && response.status !== 422) {
    throw new Error(extractErrorMessage(json));
  }

  return {
    ok: json.ok,
    meta: json.meta,
    data: json.data?.checkout ?? (json.error?.details?.checkout as CheckoutState),
    submission: json.data?.submission ?? (json.error?.details?.submission as CheckoutSubmission | null) ?? null,
  };
}

export async function getLibrary() {
  const response = await fetch(`${API_BASE}/library`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const json = (await response.json()) as ApiEnvelope<LibraryState>;
  if (!response.ok && response.status !== 401) {
    throw new Error(extractErrorMessage(json));
  }

  return json;
}
