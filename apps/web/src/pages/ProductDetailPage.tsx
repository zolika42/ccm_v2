/**
 * @fileoverview Product detail page with related products and add-to-cart action.
 */
import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addCartItem, getProduct, getRelated } from '../api/client';
import { useCart } from '../cart/CartContext';
import type { Product } from '../types';

function categoryTrail(product: Product) {
  return [product.category, product.subCategory, product.subCategory2].filter(Boolean).join(' / ');
}

function customerStateLabel(product: Product) {
  if (product.customerCatalogState === 'owned') {
    return product.customerOwnedQuantity && product.customerOwnedQuantity > 1
      ? `Owned ×${product.customerOwnedQuantity}`
      : 'Owned';
  }

  if (product.customerCatalogState === 'preordered') {
    return product.customerOwnedQuantity && product.customerOwnedQuantity > 1
      ? `Preordered ×${product.customerOwnedQuantity}`
      : 'Preordered';
  }

  return null;
}

function mediaUrl(value?: string) {
  if (!value) {
    return '';
  }

  return value.startsWith('//') ? `https:${value}` : value;
}

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

  const ownedLabel = customerStateLabel(product);
  const thirdPartyImage = mediaUrl(product.thirdParty?.image || product.thirdParty?.thumbnail);

  return (
    <section className="panel stack">
      <div className="detail-header">
        <div>
          <div className="product-id">{product.productId}</div>
          <h2>{product.description || product.productId}</h2>
          <div className="muted">{categoryTrail(product)}</div>
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
        <div className="badges">
          {product.isDownloadable && <span className="badge">Downloadable</span>}
          {product.releaseDate && <span className="badge subtle">Release: {product.releaseDate}</span>}
          {ownedLabel && <span className="badge badge-accent">{ownedLabel}</span>}
          {product.thirdParty?.rating && <span className="badge subtle">3rd-party ★ {product.thirdParty.rating}</span>}
        </div>
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
      </div>

      {product.thirdParty && (
        <section className="stack third-party-panel">
          <div>
            <h3>3rd-party product details</h3>
            <p className="muted compact-copy">
              Legacy catalog enrichment sourced from <code>3rd_party_product_details</code>
              {product.thirdParty.thirdPartyId ? ` / ${product.thirdParty.thirdPartyId}` : ''}.
            </p>
          </div>
          {thirdPartyImage && (
            <div className="third-party-image-wrap">
              <img src={thirdPartyImage} alt={`${product.description} third-party`} className="third-party-image" />
            </div>
          )}
          {product.thirdParty.description && <p>{product.thirdParty.description}</p>}
          {product.thirdParty.gallery && product.thirdParty.gallery.length > 0 && (
            <div className="third-party-gallery">
              {product.thirdParty.gallery.map((image, index) => (
                <figure key={`${image.url}-${index}`} className="third-party-gallery-item">
                  <img src={mediaUrl(image.url)} alt={image.description || `${product.description} gallery ${index + 1}`} className="third-party-gallery-image" />
                  {image.description && <figcaption className="muted compact-copy">{image.description}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      <div>
        <h3>Related products</h3>
        {related.length === 0 ? <p className="muted">No related products found.</p> : (
          <ul className="small-list">
            {related.map((item) => (
              <li key={item.productId}>
                <Link to={`/products/${encodeURIComponent(item.productId)}`}>{item.productId} — {item.description || item.productId}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
