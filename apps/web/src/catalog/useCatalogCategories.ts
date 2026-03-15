/**
 * @fileoverview Hook for loading cached catalog category hierarchy with loading/error state.
 */
import { useCallback, useEffect, useState } from 'react';
import { useCatalog, type CategoryResult } from './CatalogContext';

export function useCatalogCategories() {
  const { getCategories } = useCatalog();
  const [data, setData] = useState<CategoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCategories(force);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getCategories]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    categories: data?.categories ?? [],
    meta: data?.meta ?? null,
    loading,
    error,
    refetch: () => load(true),
  };
}
