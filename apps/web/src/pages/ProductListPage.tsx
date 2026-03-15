/**
 * @fileoverview Product catalog list page used as the storefront landing view.
 */
import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addCartItem, listProducts } from '../api/client';
import { useCart } from '../cart/CartContext';
import type { Product } from '../types';

export function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const { refresh } = useCart();

  async function load(search = '') {
    setLoading(true);
    setError(null);
    try {
      const response = await listProducts({ q: search, limit: 30, offset: 0 });
      setProducts(response.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(productId: string) {
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
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section>
      <div className="page-header">
        <h2>Products</h2>
        <div className="row search-row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" />
          <button onClick={() => void load(query)}>Search</button>
        </div>
      </div>
      {message && <p className="success">{message}</p>}
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.productId}>
            <div className="product-meta">{product.category} / {product.subCategory}</div>
            <h3>{product.description || product.productId}</h3>
            <div className="product-id">{product.productId}</div>
            <div className="price">{product.price || '—'}</div>
            <div className="badges">
              {product.isDownloadable && <span className="badge">Downloadable</span>}
              {product.status && <span className="badge subtle">{product.status}</span>}
            </div>
            <div className="product-actions">
              <Link to={`/products/${encodeURIComponent(product.productId)}`}>Open</Link>
              <button type="button" disabled={busyProductId === product.productId} onClick={() => void handleAddToCart(product.productId)}>
                {busyProductId === product.productId ? 'Adding…' : 'Add to cart'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
