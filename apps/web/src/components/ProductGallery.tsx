/**
 * @fileoverview Product media gallery with thumbnails and a lightweight modal viewer.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { ProductGalleryImage } from '../catalog/catalogMedia';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="product-gallery-placeholder" aria-hidden="true">
      <span>{title}</span>
    </div>
  );
}

export function ProductGallery({
  images,
  title,
  compact = false,
}: {
  images: ProductGalleryImage[];
  title: string;
  compact?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeImage = images[activeIndex] ?? null;
  const canNavigate = images.length > 1;

  useEffect(() => {
    setActiveIndex(0);
    setLightboxOpen(false);
  }, [images]);

  useEffect(() => {
    if (!lightboxOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxOpen(false);
        return;
      }

      if (!canNavigate) {
        return;
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex((current) => (current + 1) % images.length);
      }

      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) => (current - 1 + images.length) % images.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canNavigate, images.length, lightboxOpen]);

  const counterLabel = useMemo(() => {
    if (images.length <= 1) {
      return null;
    }

    return `${activeIndex + 1} / ${images.length}`;
  }, [activeIndex, images.length]);

  if (images.length === 0) {
    return <Placeholder title="No image yet" />;
  }

  return (
    <>
      <div className={`product-gallery${compact ? ' is-compact' : ''}`}>
        <button
          type="button"
          className="product-gallery-stage"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Open ${title} image viewer`}
        >
          {activeImage ? <img src={activeImage.url} alt={activeImage.alt} className="product-gallery-stage-image" /> : <Placeholder title={title} />}
          {counterLabel ? <span className="product-gallery-counter">{counterLabel}</span> : null}
          <span className="product-gallery-zoom">View gallery</span>
        </button>

        {canNavigate ? (
          <div className="product-gallery-thumbs" role="tablist" aria-label={`${title} images`}>
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={`product-gallery-thumb${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === activeIndex}
              >
                <img src={image.url} alt={image.alt} className="product-gallery-thumb-image" />
              </button>
            ))}
          </div>
        ) : null}

        {!compact && activeImage?.caption ? <p className="muted compact-copy product-gallery-caption">{activeImage.caption}</p> : null}
      </div>

      {lightboxOpen && activeImage ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${title} image viewer`}>
          <button type="button" className="lightbox-backdrop" aria-label="Close image viewer" onClick={() => setLightboxOpen(false)} />
          <div className="lightbox-content">
            <button type="button" className="lightbox-close" aria-label="Close image viewer" onClick={() => setLightboxOpen(false)}>
              ×
            </button>
            {canNavigate ? (
              <button
                type="button"
                className="lightbox-nav is-prev"
                aria-label="Previous image"
                onClick={() => setActiveIndex((current) => (current - 1 + images.length) % images.length)}
              >
                ‹
              </button>
            ) : null}
            <figure className="lightbox-figure">
              <img src={activeImage.url} alt={activeImage.alt} className="lightbox-image" />
              {activeImage.caption ? <figcaption className="lightbox-caption">{activeImage.caption}</figcaption> : null}
            </figure>
            {canNavigate ? (
              <button
                type="button"
                className="lightbox-nav is-next"
                aria-label="Next image"
                onClick={() => setActiveIndex((current) => (current + 1) % images.length)}
              >
                ›
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
