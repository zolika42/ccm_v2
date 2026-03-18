/**
 * @fileoverview Catalog filter toolbar for category selection and sort controls.
 */
import type { CatalogSort } from '../catalogState';
import type { CatalogCategory, CatalogSubCategory, CatalogSubCategory2 } from '../../types';

type CatalogFiltersBarProps = {
  categories: CatalogCategory[];
  subCategoryOptions: CatalogSubCategory[];
  subCategory2Options: CatalogSubCategory2[];
  selectedCategory: string;
  selectedSubCategory: string;
  selectedSubCategory2: string;
  selectedSort: CatalogSort;
  sortOptions: Array<{ value: CatalogSort; label: string }>;
  onCategoryChange: (value: string) => void;
  onSubCategoryChange: (value: string) => void;
  onSubCategory2Change: (value: string) => void;
  onSortChange: (value: CatalogSort) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
};

export function CatalogFiltersBar({
  categories,
  subCategoryOptions,
  subCategory2Options,
  selectedCategory,
  selectedSubCategory,
  selectedSubCategory2,
  selectedSort,
  sortOptions,
  onCategoryChange,
  onSubCategoryChange,
  onSubCategory2Change,
  onSortChange,
  onApplyFilters,
  onResetFilters,
}: CatalogFiltersBarProps) {
  return (
    <div className="catalog-toolbar catalog-toolbar-panel">
      <div className="catalog-filters catalog-filters-three-level catalog-filters-inline">
        <select value={selectedCategory} onChange={(event) => onCategoryChange(event.target.value)} aria-label="Category">
          <option value="">Category · all</option>
          {categories.map((category) => (
            <option key={category.name} value={category.name}>
              {category.name} ({category.productCount})
            </option>
          ))}
        </select>
        {subCategoryOptions.length > 0 ? (
          <select
            value={selectedSubCategory}
            onChange={(event) => onSubCategoryChange(event.target.value)}
            aria-label="Subcategory"
          >
            <option value="">Subcategory · all</option>
            {subCategoryOptions.map((subCategory) => (
              <option key={subCategory.name} value={subCategory.name}>
                {subCategory.name} ({subCategory.productCount})
              </option>
            ))}
          </select>
        ) : null}
        {subCategory2Options.length > 0 ? (
          <select
            value={selectedSubCategory2}
            onChange={(event) => onSubCategory2Change(event.target.value)}
            aria-label="Subcategory level 2"
          >
            <option value="">Subcategory level 2 · all</option>
            {subCategory2Options.map((subCategory2) => (
              <option key={subCategory2.name} value={subCategory2.name}>
                {subCategory2.name} ({subCategory2.productCount})
              </option>
            ))}
          </select>
        ) : null}
        <select value={selectedSort} onChange={(event) => onSortChange(event.target.value as CatalogSort)} aria-label="Sort by">
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="catalog-filter-actions">
          <button type="button" onClick={onApplyFilters}>Apply filters</button>
          <button type="button" className="button-secondary" onClick={onResetFilters}>Reset</button>
        </div>
      </div>
    </div>
  );
}
