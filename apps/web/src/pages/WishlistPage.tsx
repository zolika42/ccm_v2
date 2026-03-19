/**
 * @fileoverview Authenticated wishlist page using storefront catalog cards and bulk buy action.
 */
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addCartItem, getWishlist, removeWishlistItem, replaceWishlistItem } from '../api/client';
import { StoreCollectionCard } from '../catalog/components/StoreCollectionCard';
import { resolveCatalogMediaUrl } from '../catalog/catalogMedia';
import { useCart } from '../cart/CartContext';
import type { WishlistState } from '../types';
import { useWishlist } from '../wishlist/WishlistContext';

function wishlistCategoryLabel(item: WishlistState['items'][number]) {
  return [item.category, item.subCategory, item.subCategory2].filter(Boolean).join(' / ');
}

function wishlistSummary(item: WishlistState['items'][number]) {
  const bits = [item.status, item.releaseDate ? `Release: ${item.releaseDate}` : ''].filter(Boolean);
  return bits.join(' · ');
}

export function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { refresh: refreshWishlistBadgeState } = useWishlist();
  const { refresh: refreshCartSummary } = useCart();
  const navigate = useNavigate();

  async function loadWishlist() {
    setLoading(true);
    setError(null);
    try {
      const payload = await getWishlist();
      if (!payload.ok) {
        setNeedsLogin(true);
        setWishlist(null);
        return;
      }

      setNeedsLogin(false);
      setWishlist(payload.data ?? null);
      const nextQuantities: Record<string, number> = {};
      for (const item of payload.data?.items ?? []) {
        nextQuantities[item.productId] = item.quantity;
      }
      setQuantities(nextQuantities);
    } catch (err) {
      setNeedsLogin(false);
      setError(err instanceof Error ? err.message : 'Wishlist request failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWishlist();
  }, []);

  const categoryLabel = useMemo(() => wishlist?.meta.categories.join(', ') ?? '', [wishlist]);

  async function handleReplace(productId: string) {
    setBusyProductId(productId);
    setError(null);
    setMessage(null);
    try {
      const payload = await replaceWishlistItem(productId, Math.max(0, quantities[productId] ?? 0));
      if (!payload.ok) {
        setNeedsLogin(true);
        return;
      }
      setWishlist(payload.data);
      setQuantities((current) => ({ ...current, [productId]: Math.max(0, quantities[productId] ?? 0) }));
      await refreshWishlistBadgeState();
      setMessage(`Saved wishlist quantity for ${productId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wishlist update failed');
    } finally {
      setBusyProductId(null);
    }
  }

  async function handleRemove(productId: string) {
    setBusyProductId(productId);
    setError(null);
    setMessage(null);
    try {
      const payload = await removeWishlistItem(productId);
      if (!payload.ok) {
        setNeedsLogin(true);
        return;
      }
      setWishlist(payload.data);
      setQuantities((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      await refreshWishlistBadgeState();
      setMessage(`${productId} removed from wishlist.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wishlist remove failed');
    } finally {
      setBusyProductId(null);
    }
  }


  async function handleAddSingleToCart(productId: string) {
    const quantity = Math.max(1, quantities[productId] ?? wishlist?.items.find((item) => item.productId === productId)?.quantity ?? 1);
    setBusyProductId(productId);
    setError(null);
    setMessage(null);
    try {
      await addCartItem(productId, quantity);
      await refreshCartSummary();
      setMessage(`${productId} added to cart.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add wishlist item to cart');
    } finally {
      setBusyProductId(null);
    }
  }

  async function handleBuyAllNow() {
    if (!wishlist || wishlist.items.length === 0) {
      return;
    }

    setBulkBusy(true);
    setError(null);
    setMessage(null);

    try {
      for (const item of wishlist.items) {
        const quantity = Math.max(1, quantities[item.productId] ?? item.quantity ?? 1);
        await addCartItem(item.productId, quantity);
      }
      await refreshCartSummary();
      navigate('/checkout');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move wishlist items to cart');
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading) {
    return <p>Loading wishlist…</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (needsLogin) {
    return (
      <section className="stack">
        <div className="panel">
          <h2>Wishlist</h2>
          <p className="muted">Please sign in to view the items you saved for later.</p>
        </div>
        <div className="result-card">
          <p className="error">Please log in to view or edit wishlist items.</p>
          <Link className="button-link" to="/login">Go to login</Link>
        </div>
      </section>
    );
  }

  if (!wishlist || !wishlist.meta.hasItems) {
    return (
      <section className="stack">
        <div className="panel">
          <div className="page-header">
            <div>
              <h2>Wishlist</h2>
              <p className="muted">Saved items will appear here once you add them from the catalog.</p>
            </div>
            <button type="button" onClick={() => void loadWishlist()}>Refresh wishlist</button>
          </div>
          <div className="result-card">
            <p>No wishlist items are stored for this account.</p>
            <Link to="/products">Browse products</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="panel wishlist-header-panel">
        <div className="page-header">
          <div>
            <h2>Wishlist</h2>
            <p className="muted">{wishlist.meta.count} saved item{wishlist.meta.count === 1 ? '' : 's'} · total quantity {wishlist.meta.totalQuantity}</p>
          </div>
          <div className="row wrap-row">
            <button type="button" className="button-secondary" onClick={() => void loadWishlist()}>Refresh wishlist</button>
            <button type="button" onClick={() => void handleBuyAllNow()} disabled={bulkBusy}>{bulkBusy ? 'Sending to checkout…' : 'Buy all now'}</button>
          </div>
        </div>
        <div className="result-card compact-copy wishlist-summary-card">
          <p className="muted">{categoryLabel ? `Categories: ${categoryLabel}` : 'Everything you saved is ready to revisit here.'}</p>
          {message ? <p className="success">{message}</p> : null}
        </div>
      </div>

      <div className="wishlist-grid product-grid-catalog">
        {wishlist.items.map((item) => {
          const busy = busyProductId === item.productId;
          return (
            <StoreCollectionCard
              key={item.productId}
              href={`/products/${encodeURIComponent(item.productId)}`}
              title={item.description}
              productId={item.productId}
              categoryLabel={wishlistCategoryLabel(item)}
              priceLabel={item.price || '—'}
              summary={wishlistSummary(item)}
              imageUrl={resolveCatalogMediaUrl(item.image)}
              imageAlt={item.description}
              cornerBadge={item.isDownloadable ? 'Saved download' : undefined}
              badges={(
                <>
                  <span className="badge">Saved × {item.quantity}</span>
                  {item.preorder ? <span className="badge subtle">Preorder</span> : null}
                  {item.isDownloadable ? <span className="badge subtle">Downloadable</span> : null}
                </>
              )}
              actions={(
                <>
                  <label className="qty-input compact-label wishlist-card-qty-field">
                    <span>Qty</span>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={quantities[item.productId] ?? item.quantity}
                      onChange={(e) => setQuantities((current) => ({ ...current, [item.productId]: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </label>
                  <button type="button" disabled={busy} onClick={() => void handleReplace(item.productId)}>
                    {busy ? 'Saving…' : 'Save qty'}
                  </button>
                  <button type="button" className="button-secondary" disabled={busy} onClick={() => void handleRemove(item.productId)}>
                    Remove
                  </button>
                  <button type="button" className="button-secondary" disabled={busy || bulkBusy} onClick={() => void handleAddSingleToCart(item.productId)}>
                    Add to cart
                  </button>
                </>
              )}
            />
          );
        })}
      </div>
    </section>
  );
}
