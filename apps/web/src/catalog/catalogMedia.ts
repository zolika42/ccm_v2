/**
 * @fileoverview Catalog media and gallery helpers for legacy product imagery.
 */
import type { Product } from '../types';

export type ProductGalleryImage = {
  id: string;
  url: string;
  alt: string;
  caption?: string;
  source: 'catalog' | 'third-party';
};

const DEFAULT_LEGACY_MEDIA_BASE_URL = 'https://columbiagames.com/pix/';
const LEGACY_MEDIA_BASE_URL = (import.meta.env.VITE_LEGACY_MEDIA_BASE_URL as string | undefined)?.trim() || DEFAULT_LEGACY_MEDIA_BASE_URL;
const LEGACY_MEDIA_ORIGIN = new URL(LEGACY_MEDIA_BASE_URL).origin;

function normalizeCaption(value?: string) {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
}

export function resolveCatalogMediaUrl(value?: string) {
  const raw = (value ?? '').trim();
  if (raw === '') {
    return '';
  }

  if (/^(data:|blob:)/i.test(raw)) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }

  if (raw.startsWith('/')) {
    return new URL(raw, LEGACY_MEDIA_ORIGIN).toString();
  }

  return new URL(raw, LEGACY_MEDIA_BASE_URL).toString();
}

export function getProductGalleryImages(product: Product): ProductGalleryImage[] {
  const rawImages: Array<{
    key: string;
    value?: string;
    caption?: string;
    alt: string;
    source: 'catalog' | 'third-party';
  }> = [
    {
      key: 'image-1',
      value: product.image,
      caption: normalizeCaption(product.captions?.[0]),
      alt: `${product.description || product.productId} image 1`,
      source: 'catalog',
    },
    {
      key: 'image-2',
      value: product.image2,
      caption: normalizeCaption(product.captions?.[1]),
      alt: `${product.description || product.productId} image 2`,
      source: 'catalog',
    },
    {
      key: 'image-3',
      value: product.image3,
      caption: normalizeCaption(product.captions?.[2]),
      alt: `${product.description || product.productId} image 3`,
      source: 'catalog',
    },
    {
      key: 'image-4',
      value: product.image4,
      caption: normalizeCaption(product.captions?.[3]),
      alt: `${product.description || product.productId} image 4`,
      source: 'catalog',
    },
    {
      key: 'third-party-image',
      value: product.thirdParty?.image,
      caption: normalizeCaption(product.thirdParty?.description),
      alt: `${product.description || product.productId} external image`,
      source: 'third-party',
    },
    {
      key: 'third-party-thumbnail',
      value: product.thirdParty?.thumbnail,
      caption: undefined,
      alt: `${product.description || product.productId} thumbnail`,
      source: 'third-party',
    },
    ...((product.thirdParty?.gallery ?? []).map((image, index) => ({
      key: `third-party-gallery-${index + 1}`,
      value: image.url,
      caption: normalizeCaption(image.description),
      alt: image.description?.trim() || `${product.description || product.productId} gallery image ${index + 1}`,
      source: 'third-party' as const,
    }))),
  ];

  const seen = new Set<string>();

  return rawImages.flatMap((image) => {
    const url = resolveCatalogMediaUrl(image.value);
    if (url === '') {
      return [];
    }

    const dedupeKey = url.toLowerCase();
    if (seen.has(dedupeKey)) {
      return [];
    }
    seen.add(dedupeKey);

    return [{
      id: image.key,
      url,
      alt: image.alt,
      caption: image.caption,
      source: image.source,
    }];
  });
}

export function getPrimaryProductImage(product: Product) {
  return getProductGalleryImages(product)[0] ?? null;
}

export function isOwnedDownloadableProduct(product: Product) {
  return product.isDownloadable && product.customerCatalogState === 'owned' && (product.downloadableFilename ?? '').trim() !== '';
}

export function stripHtmlToText(value?: string) {
  const source = (value ?? '').trim();
  if (source === '') {
    return '';
  }

  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parsed = new window.DOMParser().parseFromString(source, 'text/html');
    return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  return source.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildProductSummary(product: Product) {
  const description = stripHtmlToText(product.extendedDescription || product.thirdParty?.description || product.notes);
  if (description === '') {
    return '';
  }

  if (description.length <= 180) {
    return description;
  }

  return `${description.slice(0, 177).trimEnd()}…`;
}
