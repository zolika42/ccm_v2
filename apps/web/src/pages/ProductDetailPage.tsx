/**
 * @fileoverview Product detail page with related products and add-to-cart action.
 */
import React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addCartItem, getProduct, getRelated } from '../api/client';
import { useCart } from '../cart/CartContext';
import type { Product } from '../types';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { refresh } = useCart();

  useEffect(() => {
    async function load() {
      try {
        const [productResponse, relatedResponse] = await Promise.all([
          getProduct(productId),
          getRelated(productId),
        ]);
        setProduct(productResponse.data);
        setRelated(relatedResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      }
    }

    void load();
  }, [productId]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    setMessage(null);
    setError(null);
    try {
      await addCartItem(product.productId, quantity);
      await refresh();
      setMessage(`${product.productId} added to cart.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAdding(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <section className="panel">
      <div className="detail-header">
        <div>
          <div className="product-id">{product.productId}</div>
          <h2>{product.description || product.productId}</h2>
          <div className="muted">{product.category} / {product.subCategory}</div>
        </div>
        <div className="price big">{product.price || '—'}</div>
      </div>

      <div className="stack">
        {product.extendedDescription && <p>{product.extendedDescription}</p>}
        <div className="purchase-row">
          <label className="qty-input">
            Quantity
            <input type="number" min={1} max={999} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          <button type="button" disabled={adding} onClick={() => void handleAddToCart()}>{adding ? 'Adding…' : 'Add to cart'}</button>
        </div>
        {message && <p className="success">{message}</p>}
        {product.specs && (
          <div>
            <h3>Specs</h3>
            <pre>{product.specs}</pre>
          </div>
        )}
        {product.resources && (
          <div>
            <h3>Resources</h3>
            <pre>{product.resources}</pre>
          </div>
        )}
        <div className="badges">
          {product.isDownloadable && <span className="badge">Downloadable</span>}
          {product.releaseDate && <span className="badge subtle">Release: {product.releaseDate}</span>}
        </div>
      </div>

      <div>
        <h3>Related products</h3>
        {related.length === 0 ? <p className="muted">No related products found.</p> : (
          <ul>
            {related.map((item) => (
              <li key={item.productId}>{item.productId} — {item.description || item.productId}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
