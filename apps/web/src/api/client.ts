/**
 * @fileoverview Ergonomic frontend API wrapper that exposes app-friendly calls on top of the generated client.
 */
import type {
  AuthUser,
  Cart,
  CheckoutDraft,
  CheckoutSubmission,
  CheckoutState,
} from '../types';
import { generatedApiClient } from './generated';
import { buildApiUrl } from './runtime';

export async function login(email: string, password: string): Promise<AuthUser> {
  const payload = await generatedApiClient.login({ email, password });
  return payload.data.user;
}

export async function me(): Promise<AuthUser> {
  const payload = await generatedApiClient.me();
  return payload.data.user;
}

export async function logout(): Promise<void> {
  await generatedApiClient.logout();
}

export async function listProducts(params: Record<string, string | number | undefined> = {}) {
  return generatedApiClient.listProducts(params);
}

export async function getProduct(productId: string) {
  return generatedApiClient.getProduct(productId);
}

export async function getRelated(productId: string) {
  return generatedApiClient.getRelatedProducts(productId);
}

export async function getCartIdentity() {
  return generatedApiClient.getCartIdentity();
}

export async function getCart() {
  return generatedApiClient.getCart();
}

export async function getCartSummary() {
  return generatedApiClient.getCartSummary();
}

export async function addCartItem(productId: string, quantity = 1) {
  return generatedApiClient.addCartItem({ productId, quantity });
}

export async function updateCartItem(productId: string, quantity: number) {
  return generatedApiClient.updateCartItem(productId, { quantity });
}

export async function removeCartItem(productId: string) {
  return generatedApiClient.removeCartItem(productId);
}

export async function getCheckoutSummary() {
  return generatedApiClient.getCheckoutSummary();
}

export async function validateCheckout(draft: Partial<CheckoutDraft>) {
  return generatedApiClient.validateCheckout(draft);
}

export async function submitCheckout(draft: Partial<CheckoutDraft>) {
  const json = await generatedApiClient.submitCheckout(draft);
  return {
    ok: json.ok,
    meta: json.meta,
    data: json.data?.checkout ?? (json.error?.details?.checkout as CheckoutState),
    submission: json.data?.submission ?? (json.error?.details?.submission as CheckoutSubmission | null) ?? null,
  };
}

export async function getLibrary() {
  return generatedApiClient.getLibrary();
}

export { generatedApiClient };
export type { Cart };


export function getLibraryDownloadUrl(productId: string) {
  return buildApiUrl(`/library/${encodeURIComponent(productId)}/download`);
}
