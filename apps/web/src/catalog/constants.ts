/**
 * @fileoverview Shared catalog constants for pagination, sorting, and default filters.
 */
import type { CatalogSort } from './catalogState';

export const PAGE_SIZE = 30;

export const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'default', label: 'Featured' },
  { value: 'sku_asc', label: 'SKU ↑' },
  { value: 'sku_desc', label: 'SKU ↓' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'price_asc', label: 'Price low → high' },
  { value: 'price_desc', label: 'Price high → low' },
];
