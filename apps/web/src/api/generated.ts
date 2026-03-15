/* eslint-disable */
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
  CatalogCategory,
  CheckoutDraft,
  CheckoutState,
  CheckoutSubmission,
  LibraryState,
  Product,
} from '../types';
import { requestEnvelope, requestText, type RequestOptions } from './runtime';

export class GeneratedApiClient {
  async getHealth(options: RequestOptions = {}): Promise<ApiEnvelope<Record<string, unknown>>> {
    return requestEnvelope<Record<string, unknown>>('GET', `/health`, { options: options });
  }

  async getOpenapi(options: RequestOptions = {}): Promise<string> {
    return requestText('GET', `/openapi`, { options: options });
  }

  async login(body: { email: string; password: string }, options: RequestOptions = {}): Promise<ApiEnvelope<{ user: AuthUser }>> {
    return requestEnvelope<{ user: AuthUser }>('POST', `/auth/login`, { body, options: options });
  }

  async logout(options: RequestOptions = {}): Promise<ApiEnvelope<{ loggedOut: boolean }>> {
    return requestEnvelope<{ loggedOut: boolean }>('POST', `/auth/logout`, { options: options });
  }

  async me(options: RequestOptions = {}): Promise<ApiEnvelope<{ user: AuthUser }>> {
    return requestEnvelope<{ user: AuthUser }>('GET', `/auth/me`, { options: options });
  }

  async getCatalogCategories(options: RequestOptions = {}): Promise<ApiEnvelope<{ categories: CatalogCategory[]; meta: { categoryCount: number; subCategoryCount: number } }>> {
    return requestEnvelope<{ categories: CatalogCategory[]; meta: { categoryCount: number; subCategoryCount: number } }>('GET', `/catalog/categories`, { options: options });
  }

  async listProducts(query: { limit?: number; offset?: number; q?: string; category?: string; sub_category?: string } = {}, options: RequestOptions = {}): Promise<ApiEnvelope<{ items: Product[]; meta: { total: number; limit: number; offset: number } }>> {
    return requestEnvelope<{ items: Product[]; meta: { total: number; limit: number; offset: number } }>('GET', `/catalog/products`, { query, options: options });
  }

  async getProduct(productId: string, options: RequestOptions = {}): Promise<ApiEnvelope<Product>> {
    return requestEnvelope<Product>('GET', `/catalog/products/${encodeURIComponent(productId)}`, { options: options });
  }

  async getRelatedProducts(productId: string, options: RequestOptions = {}): Promise<ApiEnvelope<Product[]>> {
    return requestEnvelope<Product[]>('GET', `/catalog/products/${encodeURIComponent(productId)}/related`, { options: options });
  }

  async getCartIdentity(options: RequestOptions = {}): Promise<ApiEnvelope<CartIdentity>> {
    return requestEnvelope<CartIdentity>('GET', `/cart/identity`, { options: options });
  }

  async getCart(options: RequestOptions = {}): Promise<ApiEnvelope<Cart>> {
    return requestEnvelope<Cart>('GET', `/cart`, { options: options });
  }

  async getCartSummary(options: RequestOptions = {}): Promise<ApiEnvelope<CartSummary>> {
    return requestEnvelope<CartSummary>('GET', `/cart/summary`, { options: options });
  }

  async addCartItem(body: { productId: string; quantity: number }, options: RequestOptions = {}): Promise<ApiEnvelope<Cart>> {
    return requestEnvelope<Cart>('POST', `/cart/items`, { body, options: options });
  }

  async updateCartItem(productId: string, body: { quantity: number }, options: RequestOptions = {}): Promise<ApiEnvelope<Cart>> {
    return requestEnvelope<Cart>('PATCH', `/cart/items/${encodeURIComponent(productId)}`, { body, options: options });
  }

  async removeCartItem(productId: string, options: RequestOptions = {}): Promise<ApiEnvelope<Cart>> {
    return requestEnvelope<Cart>('DELETE', `/cart/items/${encodeURIComponent(productId)}`, { options: options });
  }

  async getCheckoutSummary(options: RequestOptions = {}): Promise<ApiEnvelope<CheckoutState>> {
    return requestEnvelope<CheckoutState>('GET', `/checkout/summary`, { options: options });
  }

  async validateCheckout(body: Partial<CheckoutDraft>, options: RequestOptions = {}): Promise<ApiEnvelope<CheckoutState>> {
    return requestEnvelope<CheckoutState>('POST', `/checkout/validate`, { body, options: options });
  }

  async submitCheckout(body: Partial<CheckoutDraft>, options: RequestOptions = {}): Promise<ApiEnvelope<{ checkout: CheckoutState; submission: CheckoutSubmission | null }>> {
    return requestEnvelope<{ checkout: CheckoutState; submission: CheckoutSubmission | null }>('POST', `/checkout/submit`, { body, options: { ...options, allowStatuses: [401, 422] } });
  }

  async getLibrary(options: RequestOptions = {}): Promise<ApiEnvelope<LibraryState>> {
    return requestEnvelope<LibraryState>('GET', `/library`, { options: { ...options, allowStatuses: [401] } });
  }

  async getLibraryDownload(productId: string, options: RequestOptions = {}): Promise<string> {
    return requestText('GET', `/library/${encodeURIComponent(productId)}/download`, { options: options });
  }
}

export const generatedApiClient = new GeneratedApiClient();
