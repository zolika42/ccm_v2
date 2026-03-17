/**
 * @fileoverview Product detail page with related products and add-to-cart action.
 */
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addCartItem, getLibraryDownloadUrl, getProduct, getRelated } from '../api/client';
import { getPrimaryProductImage, getProductGalleryImages, isOwnedDownloadableProduct } from '../catalog/catalogMedia';
import { getStoredCatalogHref } from '../catalog/catalogState';
import { useCart } from '../cart/CartContext';
import { HtmlContent } from '../components/HtmlContent';
import { ProductGallery } from '../components/ProductGallery';
import type { Product } from '../types';
import { useWishlist } from '../wishlist/WishlistContext';

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

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { refresh } = useCart();
  const { isInWishlist, isBusy: isWishlistBusy, toggleWishlist } = useWishlist();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [productId]);

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

  async function handleToggleWishlist() {
    if (!product) return;

    setMessage(null);
    setError(null);

    try {
      const result = await toggleWishlist(product.productId, quantity);
      if (result.needsLogin) {
        setError('Please log in to manage wishlist items.');
        return;
      }

      setMessage(result.active ? `${product.productId} saved to wishlist.` : `${product.productId} removed from wishlist.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update wishlist item');
    }
  }

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

  const galleryImages = useMemo(() => (product ? getProductGalleryImages(product) : []), [product]);
  const backToCatalogHref = getStoredCatalogHref();

  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Loading…</p>;

  const ownedLabel = customerStateLabel(product);
  const wishlisted = isInWishlist(product.productId);
  const wishlistBusy = isWishlistBusy(product.productId);
  const downloadReady = isOwnedDownloadableProduct(product);

  return (
    <section className="panel stack product-detail-page">
      <div className="detail-breadcrumbs">
        <Link to={backToCatalogHref}>← Back to products</Link>
      </div>

      <div className="product-detail-layout">
        <div className="product-detail-gallery-column">
          <ProductGallery images={galleryImages} title={product.description || product.productId} />
        </div>

        <div className="product-detail-summary stack">
          <div className="detail-header">
            <div>
              <div className="product-id">{product.productId}</div>
              <h2>{product.description || product.productId}</h2>
              <div className="muted">{categoryTrail(product) || 'Uncategorized'}</div>
            </div>
            <div className="price big">{product.price || '—'}</div>
          </div>

          <HtmlContent value={product.extendedDescription} className="product-detail-lead legacy-rich-text" />

          <div className="badges">
            {product.isDownloadable && <span className="badge">Downloadable</span>}
            {product.releaseDate && <span className="badge subtle">Release: {product.releaseDate}</span>}
            {ownedLabel && <span className="badge badge-accent">{ownedLabel}</span>}
            {product.thirdParty?.rating && <span className="badge subtle">3rd-party ★ {product.thirdParty.rating}</span>}
          </div>

          <div className="purchase-row purchase-row-detail">
            <label className="qty-input">
              Quantity
              <input type="number" min={1} max={999} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <button type="button" disabled={adding} onClick={() => void handleAddToCart()}>{adding ? 'Adding…' : 'Add to cart'}</button>
            <button
              type="button"
              className={`button-secondary wishlist-toggle${wishlisted ? ' is-active' : ''}`}
              aria-pressed={wishlisted}
              disabled={wishlistBusy}
              onClick={() => void handleToggleWishlist()}
            >
              {wishlistBusy ? 'Saving…' : wishlisted ? '♥ Wishlisted' : '♡ Wishlist'}
            </button>
            {downloadReady ? (
              <a className="button-link button-link-secondary" href={getLibraryDownloadUrl(product.productId)}>
                Download now
              </a>
            ) : null}
          </div>

          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
        </div>
      </div>

      <div className="product-detail-content stack">
        {product.specs ? (
          <section className="detail-section">
            <h3>Specs</h3>
            <HtmlContent value={product.specs} className="legacy-rich-text" />
          </section>
        ) : null}

        {product.resources ? (
          <section className="detail-section">
            <h3>Resources</h3>
            <HtmlContent value={product.resources} className="legacy-rich-text" />
          </section>
        ) : null}

        {product.thirdParty ? (
          <section className="detail-section third-party-panel">
            <div className="section-heading-row">
              <h3>3rd-party catalog notes</h3>
              {product.thirdParty.thirdPartyId ? <span className="badge subtle">{product.thirdParty.thirdPartyId}</span> : null}
            </div>
            {product.thirdParty.description ? <HtmlContent value={product.thirdParty.description} className="legacy-rich-text" /> : <p className="muted compact-copy">External enrichment exists for this product, but no summary text was available.</p>}
          </section>
        ) : null}
      </div>

      <div className="detail-section">
        <div className="section-heading-row">
          <h3>Related products</h3>
          <Link to={backToCatalogHref}>Back to catalog</Link>
        </div>
        {related.length === 0 ? <p className="muted">No related products found.</p> : (
          <div className="related-grid">
            {related.map((item) => {
              const relatedImage = getPrimaryProductImage(item);
              return (
                <Link key={item.productId} to={`/products/${encodeURIComponent(item.productId)}`} className="related-card">
                  <div className="related-card-media">
                    {relatedImage ? (
                      <img src={relatedImage.url} alt={relatedImage.alt} className="related-card-image" loading="lazy" />
                    ) : (
                      <div className="related-card-image related-card-image-placeholder" aria-hidden="true">
                        <span>{item.category || 'Catalog item'}</span>
                      </div>
                    )}
                  </div>
                  <div className="related-card-body">
                    <div className="product-id">{item.productId}</div>
                    <strong>{item.description || item.productId}</strong>
                    <span className="price">{item.price || '—'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
