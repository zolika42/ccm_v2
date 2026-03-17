/**
 * @fileoverview Ergonomic frontend API wrapper that exposes app-friendly calls on top of the generated client.
 */
import type {
  AdminAccess,
  AdminConfigBundle,
  AdminConfigImportResult,
  AdminConfigInventory,
  AdminOrderDetail,
  AdminOrderListResponse,
  AdminProductUploadApplyResult,
  AdminProductUploadPreview,
  AdminProductUploadSettings,
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
  StorefrontThemeConfig,
  WishlistState,
} from '../types';
import * as mockApi from '../fixtures/mockApi';
import { generatedApiClient } from './generated';
import { buildApiUrl, requestEnvelope } from './runtime';

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

export async function getCatalogCategories(): Promise<{ categories: CatalogCategory[]; meta: { categoryCount: number; subCategoryCount: number; subCategory2Count: number } }> {
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

export async function listProducts(params: { limit?: number; offset?: number; q?: string; category?: string; sub_category?: string; sub_category2?: string; sort?: string } = {}) {
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

export async function getWishlist() {
  return USE_FIXTURE_API ? mockApi.getWishlist() : generatedApiClient.getWishlist();
}

export async function addWishlistItem(productId: string, quantity = 1) {
  return USE_FIXTURE_API ? mockApi.addWishlistItem(productId, quantity) : generatedApiClient.addWishlistItem({ productId, quantity });
}

export async function replaceWishlistItem(productId: string, quantity: number) {
  return USE_FIXTURE_API ? mockApi.replaceWishlistItem(productId, quantity) : generatedApiClient.replaceWishlistItem(productId, { quantity });
}

export async function removeWishlistItem(productId: string) {
  return USE_FIXTURE_API ? mockApi.removeWishlistItem(productId) : generatedApiClient.removeWishlistItem(productId);
}

export async function getAdminAccess(merchantId?: string, configId?: string): Promise<AdminAccess> {
  const response = USE_FIXTURE_API
    ? await mockApi.getAdminAccess(merchantId, configId)
    : await requestEnvelope<AdminAccess>('GET', '/admin/access', { query: { merchantId, configId } });
  return response.data;
}

export async function listAdminOrders(params: {
  merchantId?: string;
  configId?: string;
  view?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  return USE_FIXTURE_API
    ? mockApi.listAdminOrders(params)
    : requestEnvelope<AdminOrderListResponse>('GET', '/admin/orders', { query: params });
}

export async function getAdminOrderDetail(orderId: string, merchantId?: string, configId?: string) {
  return USE_FIXTURE_API
    ? mockApi.getAdminOrderDetail(orderId, merchantId, configId)
    : requestEnvelope<{ scope: unknown; order: AdminOrderDetail }>('GET', `/admin/orders/${encodeURIComponent(orderId)}`, {
      query: { merchantId, configId },
    });
}

export async function markAdminOrder(orderId: string, payload: { merchantId?: string; configId?: string; action?: string; note?: string }) {
  return USE_FIXTURE_API
    ? mockApi.markAdminOrder(orderId, payload)
    : requestEnvelope<{ scope: unknown; mark: unknown }>('POST', `/admin/orders/${encodeURIComponent(orderId)}/mark`, {
      body: payload,
    });
}

export async function getAdminConfigInventory(merchantId?: string, configId?: string) {
  const response = USE_FIXTURE_API
    ? await mockApi.getAdminConfigInventory(merchantId, configId)
    : await requestEnvelope<AdminConfigInventory>('GET', '/admin/config/inventory', { query: { merchantId, configId } });
  return response.data;
}

export async function exportAdminConfig(merchantId?: string, configId?: string): Promise<AdminConfigBundle> {
  const response = USE_FIXTURE_API
    ? await mockApi.exportAdminConfig(merchantId, configId)
    : await requestEnvelope<AdminConfigBundle>('GET', '/admin/config/export', { query: { merchantId, configId } });
  return response.data;
}

export async function importAdminConfig(payload: { merchantId?: string; configId?: string; bundle: AdminConfigBundle }): Promise<AdminConfigImportResult> {
  const response = USE_FIXTURE_API
    ? await mockApi.importAdminConfig(payload)
    : await requestEnvelope<AdminConfigImportResult>('POST', '/admin/config/import', { body: payload });
  return response.data;
}

export async function getAdminProductUploadSettings(merchantId?: string, configId?: string): Promise<AdminProductUploadSettings> {
  const response = USE_FIXTURE_API
    ? await mockApi.getAdminProductUploadSettings(merchantId, configId)
    : await requestEnvelope<AdminProductUploadSettings>('GET', '/admin/product-upload/settings', { query: { merchantId, configId } });
  return response.data;
}

export async function getStorefrontTheme(merchantId?: string, configId?: string): Promise<StorefrontThemeConfig> {
  const response = USE_FIXTURE_API
    ? await mockApi.getStorefrontTheme(merchantId, configId)
    : await requestEnvelope<StorefrontThemeConfig>('GET', '/storefront/theme', { query: { merchantId, configId } });
  return response.data;
}

export async function updateAdminStorefrontTheme(payload: { merchantId?: string; configId?: string; theme: string }): Promise<StorefrontThemeConfig> {
  const response = USE_FIXTURE_API
    ? await mockApi.updateAdminStorefrontTheme(payload)
    : await requestEnvelope<StorefrontThemeConfig>('PUT', '/admin/storefront/theme', { body: payload });
  return response.data;
}

export async function previewAdminProductUpload(payload: { merchantId?: string; configId?: string; content: string; fieldNames?: string[]; hasHeaderRow?: boolean }): Promise<AdminProductUploadPreview> {
  const response = USE_FIXTURE_API
    ? await mockApi.previewAdminProductUpload(payload)
    : await requestEnvelope<AdminProductUploadPreview>('POST', '/admin/product-upload/preview', { body: payload });
  return response.data;
}

export async function applyAdminProductUpload(payload: { merchantId?: string; configId?: string; content: string; fieldNames?: string[]; hasHeaderRow?: boolean }): Promise<AdminProductUploadApplyResult> {
  const response = USE_FIXTURE_API
    ? await mockApi.applyAdminProductUpload(payload)
    : await requestEnvelope<AdminProductUploadApplyResult>('POST', '/admin/product-upload/apply', { body: payload });
  return response.data;
}

export { generatedApiClient };
export type { Cart };

export function getLibraryDownloadUrl(productId: string) {
  return USE_FIXTURE_API ? mockApi.getLibraryDownloadUrl(productId) : buildApiUrl(`/library/${encodeURIComponent(productId)}/download`);
}
