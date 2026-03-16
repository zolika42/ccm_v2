/**
 * @fileoverview Ergonomic frontend API wrapper that exposes app-friendly calls on top of the generated client.
 */
import type {
  AuthUser,
  Cart,
  CatalogCategory,
  CheckoutDraft,
  CheckoutSubmission,
  CheckoutState,
  PasswordRecoveryPolicy,
  PasswordResetPayload,
  ProfileUpdatePayload,
  RegistrationPayload,
} from '../types';
import * as mockApi from '../fixtures/mockApi';
import { generatedApiClient } from './generated';
import { buildApiUrl } from './runtime';

const USE_FIXTURE_API = import.meta.env.VITE_USE_FIXTURE_API === '1'
  || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fixtureApi') === '1');

export async function login(email: string, password: string, rememberMe = false): Promise<AuthUser> {
  const payload = USE_FIXTURE_API
    ? await mockApi.login(email, password, rememberMe)
    : await generatedApiClient.login({ email, password, rememberMe });
  return payload.data.user;
}

export async function register(payload: RegistrationPayload): Promise<AuthUser> {
  const response = USE_FIXTURE_API ? await mockApi.register(payload) : await generatedApiClient.register(payload);
  return response.data.user;
}

export async function me(): Promise<AuthUser> {
  const payload = USE_FIXTURE_API ? await mockApi.me() : await generatedApiClient.me();
  return payload.data.user;
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<AuthUser> {
  const response = USE_FIXTURE_API ? await mockApi.updateProfile(payload) : await generatedApiClient.updateProfile(payload);
  return response.data.user;
}

export async function resetPassword(payload: PasswordResetPayload) {
  return USE_FIXTURE_API ? mockApi.resetPassword(payload) : generatedApiClient.resetPassword(payload);
}

export async function getPasswordRecoveryPolicy(): Promise<PasswordRecoveryPolicy> {
  const response = USE_FIXTURE_API
    ? await mockApi.getPasswordRecoveryPolicy()
    : await generatedApiClient.getPasswordRecoveryPolicy();
  return response.data.policy;
}

export async function getCatalogCategories(): Promise<{ categories: CatalogCategory[]; meta: { categoryCount: number; subCategoryCount: number } }> {
  const payload = USE_FIXTURE_API ? await mockApi.getCatalogCategories() : await generatedApiClient.getCatalogCategories();
  return payload.data;
}

export async function logout(): Promise<void> {
  if (USE_FIXTURE_API) {
    await mockApi.logout();
    return;
  }

  await generatedApiClient.logout();
}

export async function listProducts(params: { limit?: number; offset?: number; q?: string; category?: string; sub_category?: string } = {}) {
  return USE_FIXTURE_API ? mockApi.listProducts(params) : generatedApiClient.listProducts(params);
}

export async function getProduct(productId: string) {
  return USE_FIXTURE_API ? mockApi.getProduct(productId) : generatedApiClient.getProduct(productId);
}

export async function getRelated(productId: string) {
  return USE_FIXTURE_API ? mockApi.getRelated(productId) : generatedApiClient.getRelatedProducts(productId);
}

export async function getCartIdentity() {
  return USE_FIXTURE_API ? mockApi.getCartIdentity() : generatedApiClient.getCartIdentity();
}

export async function getCart() {
  return USE_FIXTURE_API ? mockApi.getCart() : generatedApiClient.getCart();
}

export async function getCartSummary() {
  return USE_FIXTURE_API ? mockApi.getCartSummary() : generatedApiClient.getCartSummary();
}

export async function addCartItem(productId: string, quantity = 1) {
  return USE_FIXTURE_API ? mockApi.addCartItem(productId, quantity) : generatedApiClient.addCartItem({ productId, quantity });
}

export async function updateCartItem(productId: string, quantity: number) {
  return USE_FIXTURE_API ? mockApi.updateCartItem(productId, quantity) : generatedApiClient.updateCartItem(productId, { quantity });
}

export async function removeCartItem(productId: string) {
  return USE_FIXTURE_API ? mockApi.removeCartItem(productId) : generatedApiClient.removeCartItem(productId);
}

export async function getCheckoutSummary() {
  return USE_FIXTURE_API ? mockApi.getCheckoutSummary() : generatedApiClient.getCheckoutSummary();
}

export async function validateCheckout(draft: Partial<CheckoutDraft>) {
  return USE_FIXTURE_API ? mockApi.validateCheckout(draft) : generatedApiClient.validateCheckout(draft);
}

export async function submitCheckout(draft: Partial<CheckoutDraft>) {
  const json = USE_FIXTURE_API ? await mockApi.submitCheckout(draft) : await generatedApiClient.submitCheckout(draft);
  return {
    ok: json.ok,
    meta: json.meta,
    data: json.data?.checkout ?? (json.error?.details?.checkout as CheckoutState),
    submission: json.data?.submission ?? (json.error?.details?.submission as CheckoutSubmission | null) ?? null,
  };
}

export async function getLibrary() {
  return USE_FIXTURE_API ? mockApi.getLibrary() : generatedApiClient.getLibrary();
}

export { generatedApiClient };
export type { Cart };

export function getLibraryDownloadUrl(productId: string) {
  return USE_FIXTURE_API ? mockApi.getLibraryDownloadUrl(productId) : buildApiUrl(`/library/${encodeURIComponent(productId)}/download`);
}
