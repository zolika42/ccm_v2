/**
 * @fileoverview Catalog summary banner that shows result counts and active filters.
 */
import { buildCatalogSummaryMessage } from '../helpers';
import { CatalogPagination } from './CatalogPagination';

type CatalogSummaryCardProps = {
  hasProducts: boolean;
  rangeStart: number;
  rangeEnd: number;
  totalProducts: number;
  activeQuery: string;
  activeCategory: string;
  activeSubCategory: string;
  activeSubCategory2: string;
  currentPage: number;
  totalPages: number;
  pageWindow: number[];
  loading?: boolean;
  onPageChange: (page: number) => void;
};

export function CatalogSummaryCard({
  hasProducts,
  rangeStart,
  rangeEnd,
  totalProducts,
  activeQuery,
  activeCategory,
  activeSubCategory,
  activeSubCategory2,
  currentPage,
  totalPages,
  pageWindow,
  loading = false,
  onPageChange,
}: CatalogSummaryCardProps) {
  const summaryMessage = buildCatalogSummaryMessage({
    hasProducts,
    rangeStart,
    rangeEnd,
    totalProducts,
    query: activeQuery,
    category: activeCategory,
    subCategory: activeSubCategory,
    subCategory2: activeSubCategory2,
  });

  return (
    <div className="catalog-summary-row catalog-summary-card">
      <div className="stack compact-stack">
        <p className="muted">{summaryMessage}</p>
      </div>
      <CatalogPagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageWindow={pageWindow}
        disabled={loading}
        onPageChange={onPageChange}
      />
    </div>
  );
}
