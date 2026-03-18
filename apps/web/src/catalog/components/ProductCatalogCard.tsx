/**
 * @fileoverview Product card used in the storefront catalog grid.
 */
import { Link } from 'react-router-dom';
import { getLibraryDownloadUrl } from '../../api/client';
import { buildProductSummary, getPrimaryProductImage, isOwnedDownloadableProduct } from '../catalogMedia';
import { categoryTrail, customerStateLabel } from '../helpers';
import type { Product } from '../../types';

type ProductCatalogCardProps = {
  product: Product;
  busyProductId: string | null;
  wishlisted: boolean;
  wishlistBusy: boolean;
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
};

export function ProductCatalogCard({
  product,
  busyProductId,
  wishlisted,
  wishlistBusy,
  onAddToCart,
  onToggleWishlist,
}: ProductCatalogCardProps) {
  const ownedLabel = customerStateLabel(product);
  const primaryImage = getPrimaryProductImage(product);
  const downloadReady = isOwnedDownloadableProduct(product);
  const productSummary = buildProductSummary(product);
  const productHref = `/products/${encodeURIComponent(product.productId)}`;
  const isBusy = busyProductId === product.productId;

  return (
    <article className="product-card product-card-catalog">
      <Link className="product-card-link" to={productHref}>
        <div className="product-card-media">
          {primaryImage ? (
            <img src={primaryImage.url} alt={primaryImage.alt} className="product-card-image" loading="lazy" />
          ) : (
            <div className="product-card-image product-card-image-placeholder" aria-hidden="true">
              <span>{product.category || 'Catalog item'}</span>
            </div>
          )}
          {downloadReady ? <span className="product-card-corner-badge">Owned download</span> : null}
        </div>

        <div className="product-card-body">
          <div className="product-meta">{categoryTrail(product) || 'Uncategorized'}</div>
          <h3>{product.description || product.productId}</h3>
          <div className="product-id">{product.productId}</div>
          <div className="price">{product.price || '—'}</div>
          <div className="badges">
            {product.isDownloadable && <span className="badge">Downloadable</span>}
            {ownedLabel && <span className="badge badge-accent">{ownedLabel}</span>}
            {product.releaseDate && <span className="badge subtle">Release: {product.releaseDate}</span>}
            {product.thirdParty?.rating && <span className="badge subtle">3rd-party ★ {product.thirdParty.rating}</span>}
          </div>
          {productSummary && <p className="muted compact-copy product-card-summary">{productSummary}</p>}
        </div>
      </Link>

      <div className="product-card-footer">
        <div className="product-actions product-actions-stack">
          {downloadReady ? (
            <a className="button-link button-link-secondary" href={getLibraryDownloadUrl(product.productId)}>
              Download now
            </a>
          ) : null}
          <button
            type="button"
            className="button-link add-to-cart-button"
            disabled={isBusy}
            onClick={() => onAddToCart(product.productId)}
          >
            <span className="add-to-cart-button-icon" aria-hidden="true">🛒</span>
            <span>{isBusy ? 'Adding…' : 'Add to cart'}</span>
          </button>
          <button
            type="button"
            className={`button-secondary wishlist-toggle${wishlisted ? ' is-active' : ''}`}
            aria-pressed={wishlisted}
            disabled={wishlistBusy}
            onClick={() => onToggleWishlist(product.productId)}
          >
            {wishlistBusy ? 'Saving…' : wishlisted ? '♥ Wishlisted' : '♡ Wishlist'}
          </button>
        </div>
      </div>
    </article>
  );
}
