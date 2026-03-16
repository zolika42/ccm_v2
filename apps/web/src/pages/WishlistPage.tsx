/**
 * @fileoverview Authenticated wishlist screen with summary/read model and add/replace/remove mutation support.
 */
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWishlist, removeWishlistItem, replaceWishlistItem } from '../api/client';
import type { WishlistState } from '../types';
import { useWishlist } from '../wishlist/WishlistContext';

export function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const { refresh: refreshWishlistBadgeState } = useWishlist();

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

  const categoryLabel = useMemo(() => wishlist?.meta.categories.join(', ') ?? '—', [wishlist]);

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
      await refreshWishlistBadgeState();
      setMessage(`Wishlist updated for ${productId}.`);
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
          <p className="muted">Wishlist summary is tied to the authenticated legacy customer record.</p>
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
              <p className="muted">Saved items will appear here once the authenticated customer adds them.</p>
            </div>
            <button type="button" onClick={() => void loadWishlist()}>Reload wishlist</button>
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
      <div className="panel">
        <div className="page-header">
          <div>
            <h2>Wishlist</h2>
            <p className="muted">
              Customer <code>{wishlist.customerId}</code> · {wishlist.meta.count} saved item{wishlist.meta.count === 1 ? '' : 's'} · total qty {wishlist.meta.totalQuantity}
            </p>
          </div>
          <button type="button" onClick={() => void loadWishlist()}>Reload wishlist</button>
        </div>

        <div className="result-card compact-copy">
          <p><strong>Legacy relation</strong>: {wishlist.meta.legacyRelation}</p>
          <p className="muted compact-copy">Categories: {categoryLabel}</p>
          {wishlist.lastMutation ? (
            <p className="muted compact-copy">Last mutation: <code>{wishlist.lastMutation.action}</code> on <code>{wishlist.lastMutation.productId}</code> (qty {wishlist.lastMutation.quantity})</p>
          ) : null}
          {message ? <p className="success">{message}</p> : null}
        </div>

        <div className="wishlist-grid">
          {wishlist.items.map((item) => (
            <article key={item.productId} className="wishlist-card">
              <div className="stack compact-stack">
                <div className="row wrap-row library-card-header">
                  <div>
                    <h3>{item.description}</h3>
                    <div className="product-id">{item.productId}</div>
                  </div>
                  <div className="badges">
                    <span className="badge">Saved × {item.quantity}</span>
                    {item.preorder ? <span className="badge subtle">Preorder</span> : null}
                    {item.isDownloadable ? <span className="badge subtle">Downloadable</span> : null}
                  </div>
                </div>

                <dl className="summary-list library-meta-list">
                  <div><dt>Category</dt><dd>{item.category || '—'}</dd></div>
                  <div><dt>Subcategory</dt><dd>{[item.subCategory, item.subCategory2].filter(Boolean).join(' / ') || '—'}</dd></div>
                  <div><dt>Price</dt><dd>{item.price || '—'}</dd></div>
                  <div><dt>Status</dt><dd>{item.status || '—'}</dd></div>
                </dl>

                <div className="row wrap-row wishlist-actions">
                  <label className="qty-input compact-label">
                    <span>Quantity</span>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={quantities[item.productId] ?? item.quantity}
                      onChange={(e) => setQuantities((current) => ({ ...current, [item.productId]: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </label>
                  <button type="button" disabled={busyProductId === item.productId} onClick={() => void handleReplace(item.productId)}>
                    {busyProductId === item.productId ? 'Saving…' : 'Save quantity'}
                  </button>
                  <button type="button" className="button-secondary" disabled={busyProductId === item.productId} onClick={() => void handleRemove(item.productId)}>
                    Remove
                  </button>
                  <Link className="button-link" to={`/products/${encodeURIComponent(item.productId)}`}>View product</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
