/**
 * @fileoverview Shared authenticated wishlist state so product surfaces can render a real toggle button.
 */
import React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { addWishlistItem, getWishlist, removeWishlistItem } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { WishlistState } from '../types';

type ToggleWishlistResult = {
  active: boolean;
  needsLogin: boolean;
};

type WishlistContextValue = {
  wishlist: WishlistState | null;
  wishlistIds: Set<string>;
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  isBusy: (productId: string) => boolean;
  refresh: () => Promise<WishlistState | null>;
  toggleWishlist: (productId: string, quantity?: number) => Promise<ToggleWishlistResult>;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

function buildWishlistIds(wishlist: WishlistState | null): Set<string> {
  return new Set((wishlist?.items ?? []).map((item) => item.productId));
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistState | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyProductIds, setBusyProductIds] = useState<Record<string, boolean>>({});

  const syncWishlist = useCallback((nextWishlist: WishlistState | null) => {
    setWishlist(nextWishlist);
    setWishlistIds(buildWishlistIds(nextWishlist));
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      syncWishlist(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const payload = await getWishlist();
      if (!payload.ok) {
        syncWishlist(null);
        return null;
      }

      const nextWishlist = payload.data ?? null;
      syncWishlist(nextWishlist);
      return nextWishlist;
    } catch {
      syncWishlist(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, syncWishlist]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isInWishlist = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds]);

  const isBusy = useCallback((productId: string) => busyProductIds[productId] === true, [busyProductIds]);

  const toggleWishlist = useCallback(async (productId: string, quantity = 1) => {
    if (!isAuthenticated) {
      return { active: false, needsLogin: true };
    }

    setBusyProductIds((current) => ({ ...current, [productId]: true }));

    try {
      const payload = wishlistIds.has(productId)
        ? await removeWishlistItem(productId)
        : await addWishlistItem(productId, quantity);

      if (!payload.ok) {
        syncWishlist(null);
        return { active: false, needsLogin: true };
      }

      const nextWishlist = payload.data ?? null;
      syncWishlist(nextWishlist);
      return {
        active: buildWishlistIds(nextWishlist).has(productId),
        needsLogin: false,
      };
    } finally {
      setBusyProductIds((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }
  }, [isAuthenticated, syncWishlist, wishlistIds]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlist,
      wishlistIds,
      loading,
      isInWishlist,
      isBusy,
      refresh,
      toggleWishlist,
    }),
    [wishlist, wishlistIds, loading, isInWishlist, isBusy, refresh, toggleWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used inside WishlistProvider');
  }

  return context;
}
