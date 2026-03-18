/**
 * @fileoverview Pure helper utilities for catalog summaries and product presentation.
 */
import type { Product } from '../types';

type CatalogSummaryMessageArgs = {
  hasProducts: boolean;
  rangeStart: number;
  rangeEnd: number;
  totalProducts: number;
  query: string;
  category: string;
  subCategory: string;
  subCategory2: string;
};

function formatFilterSuffix({ query, category, subCategory, subCategory2 }: Omit<CatalogSummaryMessageArgs, 'hasProducts' | 'rangeStart' | 'rangeEnd' | 'totalProducts'>) {
  return `${query ? ` for “${query}”` : ''}${category ? ` in ${category}` : ''}${subCategory ? ` / ${subCategory}` : ''}${subCategory2 ? ` / ${subCategory2}` : ''}`;
}

export function buildCatalogSummaryMessage(args: CatalogSummaryMessageArgs) {
  const suffix = formatFilterSuffix(args);

  if (args.hasProducts) {
    return `Showing ${args.rangeStart}-${args.rangeEnd} of ${args.totalProducts} products${suffix}.`;
  }

  return `No products found${suffix}.`;
}

export function categoryTrail(product: Product) {
  return [product.category, product.subCategory, product.subCategory2].filter(Boolean).join(' / ');
}

export function customerStateLabel(product: Product) {
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
