/**
 * @fileoverview Shared storefront collection card used by wishlist and library views for catalog-style presentation.
 */
import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type StoreCollectionCardProps = {
  href: string;
  title: string;
  productId: string;
  categoryLabel?: string;
  priceLabel?: string;
  summary?: string;
  imageUrl?: string;
  imageAlt?: string;
  cornerBadge?: string;
  badges?: ReactNode;
  actions?: ReactNode;
};

export function StoreCollectionCard({
  href,
  title,
  productId,
  categoryLabel,
  priceLabel,
  summary,
  imageUrl,
  imageAlt,
  cornerBadge,
  badges,
  actions,
}: StoreCollectionCardProps) {
  return (
    <article className="product-card product-card-catalog collection-product-card">
      <Link className="product-card-link" to={href}>
        <div className="product-card-media">
          {imageUrl ? (
            <img src={imageUrl} alt={imageAlt || title} className="product-card-image" loading="lazy" />
          ) : (
            <div className="product-card-image product-card-image-placeholder" aria-hidden="true">
              <span>{categoryLabel || 'Catalog item'}</span>
            </div>
          )}
          {cornerBadge ? <span className="product-card-corner-badge">{cornerBadge}</span> : null}
        </div>

        <div className="product-card-body">
          <div className="product-meta">{categoryLabel || 'Uncategorized'}</div>
          <h3>{title}</h3>
          <div className="product-id">{productId}</div>
          {priceLabel ? <div className="price">{priceLabel}</div> : null}
          {badges ? <div className="badges">{badges}</div> : null}
          {summary ? <p className="muted compact-copy product-card-summary">{summary}</p> : null}
        </div>
      </Link>

      {actions ? (
        <div className="product-card-footer">
          <div className="product-actions product-actions-stack">{actions}</div>
        </div>
      ) : null}
    </article>
  );
}
