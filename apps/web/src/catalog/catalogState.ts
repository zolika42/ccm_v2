/**
 * @fileoverview URL/session persistence helpers for the storefront catalog view.
 */

export type CatalogSort = 'default' | 'sku_asc' | 'sku_desc' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

export type CatalogViewState = {
  q: string;
  category: string;
  subCategory: string;
  subCategory2: string;
  sort: CatalogSort;
  page: number;
};

const STORAGE_KEY = 'cg.catalog.view';

export const DEFAULT_CATALOG_VIEW_STATE: CatalogViewState = {
  q: '',
  category: '',
  subCategory: '',
  subCategory2: '',
  sort: 'default',
  page: 1,
};

function normalizeSort(value: string | null): CatalogSort {
  const normalized = (value ?? '').trim().toLowerCase();
  return ['default', 'sku_asc', 'sku_desc', 'name_asc', 'name_desc', 'price_asc', 'price_desc'].includes(normalized)
    ? normalized as CatalogSort
    : 'default';
}

function safePage(value: string | null) {
  const parsed = Number(value ?? '1');
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

export function buildCatalogSearchParams(state: CatalogViewState) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.subCategory) params.set('subCategory', state.subCategory);
  if (state.subCategory2) params.set('subCategory2', state.subCategory2);
  if (state.sort !== 'default') params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
  return params;
}

export function buildCatalogHref(state: CatalogViewState) {
  const query = buildCatalogSearchParams(state).toString();
  return query ? `/products?${query}` : '/products';
}

export function catalogViewStateFromSearchParams(searchParams: URLSearchParams | ReadonlyURLSearchParamsLike): CatalogViewState {
  return {
    q: searchParams.get('q')?.trim() ?? '',
    category: searchParams.get('category')?.trim() ?? '',
    subCategory: searchParams.get('subCategory')?.trim() ?? '',
    subCategory2: searchParams.get('subCategory2')?.trim() ?? '',
    sort: normalizeSort(searchParams.get('sort')),
    page: safePage(searchParams.get('page')),
  };
}

export function hasCatalogSearchParams(searchParams: URLSearchParams | ReadonlyURLSearchParamsLike) {
  return ['q', 'category', 'subCategory', 'subCategory2', 'sort', 'page'].some((key) => {
    const value = searchParams.get(key);
    return value !== null && value !== '';
  });
}

export function readStoredCatalogViewState(): CatalogViewState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CatalogViewState>;
    return {
      q: typeof parsed.q === 'string' ? parsed.q : '',
      category: typeof parsed.category === 'string' ? parsed.category : '',
      subCategory: typeof parsed.subCategory === 'string' ? parsed.subCategory : '',
      subCategory2: typeof parsed.subCategory2 === 'string' ? parsed.subCategory2 : '',
      sort: normalizeSort(typeof parsed.sort === 'string' ? parsed.sort : null),
      page: typeof parsed.page === 'number' && parsed.page > 0 ? Math.floor(parsed.page) : 1,
    };
  } catch {
    return null;
  }
}

export function storeCatalogViewState(state: CatalogViewState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getStoredCatalogHref() {
  const state = readStoredCatalogViewState();
  return state ? buildCatalogHref(state) : '/products';
}

type ReadonlyURLSearchParamsLike = {
  get(name: string): string | null;
};
