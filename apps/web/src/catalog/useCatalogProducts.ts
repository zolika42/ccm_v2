/**
 * @fileoverview Hook for loading cached catalog product lists with loading/error state.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCatalog, type CatalogListResult, type ProductFilters } from './CatalogContext';

export function useCatalogProducts(filters: ProductFilters) {
  const { getProducts } = useCatalog();
  const stableFilters = useMemo(
    () => ({
      q: filters.q ?? '',
      category: filters.category ?? '',
      sub_category: filters.sub_category ?? '',
      limit: filters.limit ?? 30,
      offset: filters.offset ?? 0,
    }),
    [filters.q, filters.category, filters.sub_category, filters.limit, filters.offset],
  );
  const [data, setData] = useState<CatalogListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProducts(stableFilters, force);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getProducts, stableFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    products: data?.items ?? [],
    meta: data?.meta ?? null,
    loading,
    error,
    refetch: () => load(true),
  };
}
