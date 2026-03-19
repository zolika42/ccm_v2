/**
 * @fileoverview Product catalog list page used as the storefront landing view.
 */
import { CatalogFiltersBar } from '../catalog/components/CatalogFiltersBar';
import { CatalogPagination } from '../catalog/components/CatalogPagination';
import { CatalogSummaryCard } from '../catalog/components/CatalogSummaryCard';
import { ProductCatalogCard } from '../catalog/components/ProductCatalogCard';
import { SORT_OPTIONS } from '../catalog/constants';
import { useProductCatalogPage } from '../catalog/hooks/useProductCatalogPage';
import { HtmlContent } from '../components/HtmlContent';

export function ProductListPage() {
  const {
    products,
    categories,
    loading,
    error,
    message,
    busyProductId,
    totalPages,
    currentPage,
    pageWindow,
    hasProducts,
    rangeStart,
    rangeEnd,
    totalProducts,
    draftFilters,
    appliedViewState,
    subCategoryOptions,
    subCategory2Options,
    activeCategoryDescriptionHtml,
    activeCategoryHeading,
    isInWishlist,
    isWishlistBusy,
    setSelectedCategory,
    setSelectedSubCategory,
    setSelectedSubCategory2,
    handleApplyFilters,
    handleResetFilters,
    handleSortChange,
    handlePageChange,
    handleAddToCart,
    handleToggleWishlist,
  } = useProductCatalogPage();

  return (
    <section className="catalog-page stack">
      <h2>Products</h2>
      <div className="page-header product-page-header catalog-page-header">
        <CatalogFiltersBar
          categories={categories}
          subCategoryOptions={subCategoryOptions}
          subCategory2Options={subCategory2Options}
          selectedCategory={draftFilters.category}
          selectedSubCategory={draftFilters.subCategory}
          selectedSubCategory2={draftFilters.subCategory2}
          selectedSort={draftFilters.sort}
          sortOptions={SORT_OPTIONS}
          onCategoryChange={setSelectedCategory}
          onSubCategoryChange={setSelectedSubCategory}
          onSubCategory2Change={setSelectedSubCategory2}
          onSortChange={handleSortChange}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />
      </div>

      {message && <p className="success">{message}</p>}
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && activeCategoryDescriptionHtml && (
        <section className="catalog-description-card stack" aria-label="Selected category description">
          <div className="catalog-description-header">
            <h3>{activeCategoryHeading || 'Category overview'}</h3>
            <div className="muted compact-copy">Legacy category description</div>
          </div>
          <HtmlContent value={activeCategoryDescriptionHtml} className="legacy-rich-text" />
        </section>
      )}

      {!loading && !error && (
        <>
          <CatalogSummaryCard
            hasProducts={hasProducts}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalProducts={totalProducts}
            activeQuery={appliedViewState.q}
            activeCategory={appliedViewState.category}
            activeSubCategory={appliedViewState.subCategory}
            activeSubCategory2={appliedViewState.subCategory2}
            currentPage={currentPage}
            totalPages={totalPages}
            pageWindow={pageWindow}
            onPageChange={handlePageChange}
          />

          <div className="product-grid product-grid-catalog">
            {products.map((product) => (
              <ProductCatalogCard
                key={product.productId}
                product={product}
                busyProductId={busyProductId}
                wishlisted={isInWishlist(product.productId)}
                wishlistBusy={isWishlistBusy(product.productId)}
                onAddToCart={(productId) => void handleAddToCart(productId)}
                onToggleWishlist={(productId) => void handleToggleWishlist(productId)}
              />
            ))}
          </div>

          <div className="catalog-summary-row catalog-summary-card">
            <div className="muted">Page {currentPage} of {totalPages}</div>
            <CatalogPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageWindow={pageWindow}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </section>
  );
}
