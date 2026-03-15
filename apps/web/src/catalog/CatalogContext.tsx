/**
 * @fileoverview Catalog server-state provider with lightweight in-memory query caching for product lists and category filters.
 */
import React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { getCatalogCategories, listProducts } from '../api/client';
import type { CatalogCategory, Product } from '../types';

type ProductFilters = {
  q?: string;
  category?: string;
  sub_category?: string;
  limit?: number;
  offset?: number;
};

type CatalogListResult = {
  items: Product[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
};

type CategoryResult = {
  categories: CatalogCategory[];
  meta: {
    categoryCount: number;
    subCategoryCount: number;
  };
};

type CacheEntry<T> = {
  value: T;
  updatedAt: number;
};

type CatalogContextValue = {
  getProducts: (filters?: ProductFilters, force?: boolean) => Promise<CatalogListResult>;
  getCategories: (force?: boolean) => Promise<CategoryResult>;
  invalidateProducts: () => void;
  invalidateCategories: () => void;
};

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

const PRODUCT_CACHE_TTL_MS = 60_000;
const CATEGORY_CACHE_TTL_MS = 5 * 60_000;

function normalizeFilters(filters: ProductFilters = {}): ProductFilters {
  return {
    q: filters.q?.trim() || undefined,
    category: filters.category?.trim() || undefined,
    sub_category: filters.sub_category?.trim() || undefined,
    limit: filters.limit ?? 30,
    offset: filters.offset ?? 0,
  };
}

function buildProductCacheKey(filters: ProductFilters = {}) {
  const normalized = normalizeFilters(filters);
  return JSON.stringify(normalized);
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const productCacheRef = useRef(new Map<string, CacheEntry<CatalogListResult>>());
  const productPromiseRef = useRef(new Map<string, Promise<CatalogListResult>>());
  const categoryCacheRef = useRef<CacheEntry<CategoryResult> | null>(null);
  const categoryPromiseRef = useRef<Promise<CategoryResult> | null>(null);

  const getProducts = useCallback(async (filters: ProductFilters = {}, force = false) => {
    const normalized = normalizeFilters(filters);
    const key = buildProductCacheKey(normalized);
    const now = Date.now();
    const cached = productCacheRef.current.get(key);

    if (!force && cached && now - cached.updatedAt < PRODUCT_CACHE_TTL_MS) {
      return cached.value;
    }

    const inFlight = productPromiseRef.current.get(key);
    if (!force && inFlight) {
      return inFlight;
    }

    const promise = listProducts(normalized).then((response) => {
      const value = response.data;
      productCacheRef.current.set(key, { value, updatedAt: Date.now() });
      productPromiseRef.current.delete(key);
      return value;
    }).catch((error) => {
      productPromiseRef.current.delete(key);
      throw error;
    });

    productPromiseRef.current.set(key, promise);
    return promise;
  }, []);

  const getCategories = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = categoryCacheRef.current;

    if (!force && cached && now - cached.updatedAt < CATEGORY_CACHE_TTL_MS) {
      return cached.value;
    }

    if (!force && categoryPromiseRef.current) {
      return categoryPromiseRef.current;
    }

    const promise = getCatalogCategories().then((value) => {
      categoryCacheRef.current = { value, updatedAt: Date.now() };
      categoryPromiseRef.current = null;
      return value;
    }).catch((error) => {
      categoryPromiseRef.current = null;
      throw error;
    });

    categoryPromiseRef.current = promise;
    return promise;
  }, []);

  const invalidateProducts = useCallback(() => {
    productCacheRef.current.clear();
    productPromiseRef.current.clear();
  }, []);

  const invalidateCategories = useCallback(() => {
    categoryCacheRef.current = null;
    categoryPromiseRef.current = null;
  }, []);

  const value = useMemo<CatalogContextValue>(
    () => ({ getProducts, getCategories, invalidateProducts, invalidateCategories }),
    [getProducts, getCategories, invalidateProducts, invalidateCategories],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used inside CatalogProvider');
  }

  return context;
}

export type { CatalogListResult, CategoryResult, ProductFilters };
