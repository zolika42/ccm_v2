/**
 * @fileoverview Stateful orchestration hook for the storefront product catalog page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addCartItem, getCatalogCategories, listProducts } from '../../api/client';
import type { CatalogCategory, CatalogSubCategory, CatalogSubCategory2, Product } from '../../types';
import { useCart } from '../../cart/CartContext';
import { useWishlist } from '../../wishlist/WishlistContext';
import {
  DEFAULT_CATALOG_VIEW_STATE,
  buildCatalogSearchParams,
  catalogViewStateFromSearchParams,
  hasCatalogSearchParams,
  readStoredCatalogViewState,
  storeCatalogViewState,
  type CatalogSort,
  type CatalogViewState,
} from '../catalogState';
import { PAGE_SIZE } from '../constants';
import { useSearchParams } from 'react-router-dom';

type DraftCatalogFilters = Pick<CatalogViewState, 'q' | 'category' | 'subCategory' | 'subCategory2' | 'sort'>;

type LoadOptions = {
  replaceHistory?: boolean;
};

function draftFiltersFromViewState(viewState: CatalogViewState): DraftCatalogFilters {
  return {
    q: viewState.q,
    category: viewState.category,
    subCategory: viewState.subCategory,
    subCategory2: viewState.subCategory2,
    sort: viewState.sort,
  };
}

const DEFAULT_DRAFT_FILTERS = draftFiltersFromViewState(DEFAULT_CATALOG_VIEW_STATE);

export function useProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [draftFilters, setDraftFilters] = useState<DraftCatalogFilters>(DEFAULT_DRAFT_FILTERS);
  const [appliedViewState, setAppliedViewState] = useState<CatalogViewState>(DEFAULT_CATALOG_VIEW_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const { refresh } = useCart();
  const { isInWishlist, isBusy: isWishlistBusy, toggleWishlist } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const suppressNextUrlSyncRef = useRef(false);

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const currentPage = appliedViewState.page;

  const pageWindow = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - windowSize + 1));
    const end = Math.min(totalPages, start + windowSize - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const selectedCategoryEntry = useMemo(
    () => categories.find((entry) => entry.name === draftFilters.category) ?? null,
    [categories, draftFilters.category],
  );

  const subCategoryOptions = useMemo<CatalogSubCategory[]>(() => {
    return selectedCategoryEntry?.subCategories ?? [];
  }, [selectedCategoryEntry]);

  const selectedSubCategoryEntry = useMemo(
    () => subCategoryOptions.find((entry) => entry.name === draftFilters.subCategory) ?? null,
    [draftFilters.subCategory, subCategoryOptions],
  );

  const subCategory2Options = useMemo<CatalogSubCategory2[]>(() => {
    return selectedSubCategoryEntry?.subCategory2s ?? [];
  }, [selectedSubCategoryEntry]);

  const syncCatalogState = useCallback((state: CatalogViewState, replace = false) => {
    storeCatalogViewState(state);

    const nextParams = buildCatalogSearchParams(state);
    const nextParamsString = nextParams.toString();
    const currentParamsString = searchParams.toString();

    if (nextParamsString !== currentParamsString) {
      suppressNextUrlSyncRef.current = true;
      setSearchParams(nextParams, { replace });
    }
  }, [searchParams, setSearchParams]);

  const load = useCallback(async (viewState: CatalogViewState, options: LoadOptions = {}) => {
    setLoading(true);
    setError(null);

    try {
      const safePage = Math.max(1, viewState.page);
      const response = await listProducts({
        q: viewState.q,
        category: viewState.category || undefined,
        sub_category: viewState.subCategory || undefined,
        sub_category2: viewState.subCategory2 || undefined,
        sort: viewState.sort === 'default' ? undefined : viewState.sort,
        limit: PAGE_SIZE,
        offset: (safePage - 1) * PAGE_SIZE,
      });

      const items = response.data.items;
      const total = Math.max(items.length, response.data.meta?.total ?? 0);
      const resolvedTotalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const resolvedPage = Math.min(safePage, resolvedTotalPages);

      let finalItems = items;
      let finalTotal = total;

      if (resolvedPage !== safePage) {
        const fallback = await listProducts({
          q: viewState.q,
          category: viewState.category || undefined,
          sub_category: viewState.subCategory || undefined,
          sub_category2: viewState.subCategory2 || undefined,
          sort: viewState.sort === 'default' ? undefined : viewState.sort,
          limit: PAGE_SIZE,
          offset: (resolvedPage - 1) * PAGE_SIZE,
        });

        finalItems = fallback.data.items;
        finalTotal = Math.max(fallback.data.items.length, fallback.data.meta?.total ?? 0);
      }

      const nextViewState = {
        ...viewState,
        page: resolvedPage,
      };

      setProducts(finalItems);
      setTotalProducts(finalTotal);
      setAppliedViewState(nextViewState);
      syncCatalogState(nextViewState, options.replaceHistory ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [syncCatalogState]);

  const setSelectedCategory = useCallback((value: string) => {
    setDraftFilters((current) => ({ ...current, category: value }));
  }, []);

  const setSelectedSubCategory = useCallback((value: string) => {
    setDraftFilters((current) => ({ ...current, subCategory: value }));
  }, []);

  const setSelectedSubCategory2 = useCallback((value: string) => {
    setDraftFilters((current) => ({ ...current, subCategory2: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    void load({
      ...draftFilters,
      q: draftFilters.q.trim(),
      page: 1,
    });
  }, [draftFilters, load]);

  const handleResetFilters = useCallback(() => {
    setDraftFilters(DEFAULT_DRAFT_FILTERS);
    void load(DEFAULT_CATALOG_VIEW_STATE);
  }, [load]);

  const handleSortChange = useCallback((sort: CatalogSort) => {
    setDraftFilters((current) => ({ ...current, sort }));
    void load({
      ...appliedViewState,
      sort,
      page: 1,
    });
  }, [appliedViewState, load]);

  const handlePageChange = useCallback((page: number) => {
    if (loading || page === currentPage || page < 1 || page > totalPages) {
      return;
    }

    void load({
      ...appliedViewState,
      page,
    });
  }, [appliedViewState, currentPage, load, loading, totalPages]);

  const handleAddToCart = useCallback(async (productId: string) => {
    setBusyProductId(productId);
    setMessage(null);
    setError(null);

    try {
      await addCartItem(productId, 1);
      await refresh();
      setMessage(`${productId} added to cart.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setBusyProductId(null);
    }
  }, [refresh]);

  const handleToggleWishlist = useCallback(async (productId: string) => {
    setMessage(null);
    setError(null);

    try {
      const result = await toggleWishlist(productId, 1);

      if (result.needsLogin) {
        setError('Please log in to manage wishlist items.');
        return;
      }

      setMessage(result.active ? `${productId} saved to wishlist.` : `${productId} removed from wishlist.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update wishlist item');
    }
  }, [toggleWishlist]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const categoryResponse = await getCatalogCategories();
        if (!cancelled) {
          setCategories(categoryResponse.categories);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load categories');
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (suppressNextUrlSyncRef.current) {
      suppressNextUrlSyncRef.current = false;
      return;
    }

    const nextState = hasCatalogSearchParams(searchParams)
      ? catalogViewStateFromSearchParams(searchParams)
      : readStoredCatalogViewState() ?? DEFAULT_CATALOG_VIEW_STATE;

    setDraftFilters(draftFiltersFromViewState(nextState));
    void load(nextState, { replaceHistory: true });
  }, [load, searchParams]);

  useEffect(() => {
    setDraftFilters((current) => {
      if (!current.category && (current.subCategory || current.subCategory2)) {
        return {
          ...current,
          subCategory: '',
          subCategory2: '',
        };
      }

      if (current.category && current.subCategory && !subCategoryOptions.some((item) => item.name === current.subCategory)) {
        return {
          ...current,
          subCategory: '',
          subCategory2: '',
        };
      }

      return current;
    });
  }, [subCategoryOptions]);

  useEffect(() => {
    setDraftFilters((current) => {
      if (!current.subCategory && current.subCategory2) {
        return {
          ...current,
          subCategory2: '',
        };
      }

      if (current.subCategory && current.subCategory2 && !subCategory2Options.some((item) => item.name === current.subCategory2)) {
        return {
          ...current,
          subCategory2: '',
        };
      }

      return current;
    });
  }, [subCategory2Options]);

  const hasProducts = products.length > 0;
  const rangeStart = totalProducts === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = totalProducts === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalProducts);

  return {
    products,
    categories,
    loading,
    error,
    message,
    busyProductId,
    totalProducts,
    totalPages,
    currentPage,
    pageWindow,
    hasProducts,
    rangeStart,
    rangeEnd,
    draftFilters,
    appliedViewState,
    subCategoryOptions,
    subCategory2Options,
    isInWishlist,
    isWishlistBusy,
    setSelectedCategory,
    setSelectedSubCategory,
    setSelectedSubCategory2,
    handleApplyFilters,
    handleResetFilters,
    handleSortChange,
    handlePageChange,
    handleAddToCart,
    handleToggleWishlist,
  };
}
