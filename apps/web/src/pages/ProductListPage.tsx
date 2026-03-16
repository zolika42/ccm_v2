/**
 * @fileoverview Product catalog list page used as the storefront landing view.
 */
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addCartItem, getCatalogCategories, listProducts } from '../api/client';
import { useCart } from '../cart/CartContext';
import type { CatalogCategory, CatalogSubCategory, CatalogSubCategory2, Product } from '../types';
import { useWishlist } from '../wishlist/WishlistContext';

const PAGE_SIZE = 30;

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

export function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedSubCategory2, setSelectedSubCategory2] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubCategory, setActiveSubCategory] = useState('');
  const [activeSubCategory2, setActiveSubCategory2] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const { refresh } = useCart();
  const { isInWishlist, isBusy: isWishlistBusy, toggleWishlist } = useWishlist();

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const pageWindow = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - windowSize + 1));
    const end = Math.min(totalPages, start + windowSize - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const selectedCategoryEntry = useMemo(
    () => categories.find((entry) => entry.name === selectedCategory) ?? null,
    [categories, selectedCategory],
  );

  const subCategoryOptions = useMemo<CatalogSubCategory[]>(() => {
    if (!selectedCategoryEntry) {
      return [];
    }

    return selectedCategoryEntry.subCategories ?? [];
  }, [selectedCategoryEntry]);

  const selectedSubCategoryEntry = useMemo(
    () => subCategoryOptions.find((entry) => entry.name === selectedSubCategory) ?? null,
    [subCategoryOptions, selectedSubCategory],
  );

  const subCategory2Options = useMemo<CatalogSubCategory2[]>(() => {
    if (!selectedSubCategoryEntry) {
      return [];
    }

    return selectedSubCategoryEntry.subCategory2s ?? [];
  }, [selectedSubCategoryEntry]);

  async function load(search = '', page = 1, category = '', subCategory = '', subCategory2 = '') {
    setLoading(true);
    setError(null);

    try {
      const safePage = Math.max(1, page);
      const response = await listProducts({
        q: search,
        category: category || undefined,
        sub_category: subCategory || undefined,
        sub_category2: subCategory2 || undefined,
        limit: PAGE_SIZE,
        offset: (safePage - 1) * PAGE_SIZE,
      });

      const items = response.data.items;
      const total = Math.max(items.length, response.data.meta?.total ?? 0);
      const resolvedTotalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const resolvedPage = Math.min(safePage, resolvedTotalPages);

      if (resolvedPage !== safePage) {
        const fallback = await listProducts({
          q: search,
          category: category || undefined,
          sub_category: subCategory || undefined,
          sub_category2: subCategory2 || undefined,
          limit: PAGE_SIZE,
          offset: (resolvedPage - 1) * PAGE_SIZE,
        });

        setProducts(fallback.data.items);
        setTotalProducts(Math.max(fallback.data.items.length, fallback.data.meta?.total ?? 0));
        setCurrentPage(resolvedPage);
        setActiveQuery(search);
        setActiveCategory(category);
        setActiveSubCategory(subCategory);
        setActiveSubCategory2(subCategory2);
        return;
      }

      setProducts(items);
      setTotalProducts(total);
      setCurrentPage(resolvedPage);
      setActiveQuery(search);
      setActiveCategory(category);
      setActiveSubCategory(subCategory);
      setActiveSubCategory2(subCategory2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(productId: string) {
    setBusyProductId(productId);
    setMessage(null);
    setError(null);
    try {
      await addCartItem(productId, 1);
      await refresh();
      setMessage(`${productId} added to cart.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setBusyProductId(null);
    }
  }


  async function handleToggleWishlist(productId: string) {
    setMessage(null);
    setError(null);


    try {
      const result = await toggleWishlist(productId, 1);
      if (result.needsLogin) {
        setError('Please log in to manage wishlist items.');
        return;
      }

      setMessage(result.active ? `${productId} saved to wishlist.` : `${productId} removed from wishlist.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update wishlist item');
    }
  }

  function handleSearchSubmit() {
    void load(query.trim(), 1, selectedCategory, selectedSubCategory, selectedSubCategory2);
  }

  function handleResetFilters() {
    setQuery('');
    setSelectedCategory('');
    setSelectedSubCategory('');
    setSelectedSubCategory2('');
    void load('', 1, '', '', '');
  }

  function handlePageChange(page: number) {
    if (loading || page === currentPage || page < 1 || page > totalPages) {
      return;
    }

    void load(activeQuery, page, activeCategory, activeSubCategory, activeSubCategory2);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const categoryResponse = await getCatalogCategories();
        setCategories(categoryResponse.categories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      }

      await load('', 1, '', '', '');
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedCategory && (selectedSubCategory || selectedSubCategory2)) {
      setSelectedSubCategory('');
      setSelectedSubCategory2('');
      return;
    }

    if (selectedCategory && selectedSubCategory && !subCategoryOptions.some((item) => item.name === selectedSubCategory)) {
      setSelectedSubCategory('');
      setSelectedSubCategory2('');
    }
  }, [selectedCategory, selectedSubCategory, selectedSubCategory2, subCategoryOptions]);

  useEffect(() => {
    if (!selectedSubCategory && selectedSubCategory2) {
      setSelectedSubCategory2('');
      return;
    }

    if (selectedSubCategory && selectedSubCategory2 && !subCategory2Options.some((item) => item.name === selectedSubCategory2)) {
      setSelectedSubCategory2('');
    }
  }, [selectedSubCategory, selectedSubCategory2, subCategory2Options]);

  const hasProducts = products.length > 0;
  const rangeStart = totalProducts === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = totalProducts === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalProducts);

  return (
    <section>
      <div className="page-header product-page-header">
        <h2>Products</h2>
        <div className="catalog-toolbar">
          <div className="row search-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit();
                }
              }}
              placeholder="Search products…"
            />
            <button onClick={handleSearchSubmit}>Search</button>
          </div>
          <div className="catalog-filters catalog-filters-three-level">
            <label>
              <span>Category</span>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name} ({category.productCount})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Subcategory</span>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                disabled={!selectedCategory || subCategoryOptions.length === 0}
              >
                <option value="">All subcategories</option>
                {subCategoryOptions.map((subCategory) => (
                  <option key={subCategory.name} value={subCategory.name}>
                    {subCategory.name} ({subCategory.productCount})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Subcategory level 2</span>
              <select
                value={selectedSubCategory2}
                onChange={(e) => setSelectedSubCategory2(e.target.value)}
                disabled={!selectedSubCategory || subCategory2Options.length === 0}
              >
                <option value="">All third-level groups</option>
                {subCategory2Options.map((subCategory2) => (
                  <option key={subCategory2.name} value={subCategory2.name}>
                    {subCategory2.name} ({subCategory2.productCount})
                  </option>
                ))}
              </select>
            </label>
            <div className="catalog-filter-actions">
              <button type="button" onClick={handleSearchSubmit}>Apply filters</button>
              <button type="button" className="button-secondary" onClick={handleResetFilters}>Reset</button>
            </div>
          </div>
        </div>
      </div>
      {message && <p className="success">{message}</p>}
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && (
        <div className="catalog-summary-row">
          <p className="muted">
            {hasProducts
              ? `Showing ${rangeStart}-${rangeEnd} of ${totalProducts} products${activeQuery ? ` for “${activeQuery}”` : ''}${activeCategory ? ` in ${activeCategory}` : ''}${activeSubCategory ? ` / ${activeSubCategory}` : ''}${activeSubCategory2 ? ` / ${activeSubCategory2}` : ''}.`
              : `No products found${activeQuery ? ` for “${activeQuery}”` : ''}${activeCategory ? ` in ${activeCategory}` : ''}${activeSubCategory ? ` / ${activeSubCategory}` : ''}${activeSubCategory2 ? ` / ${activeSubCategory2}` : ''}.`}
          </p>
          {totalPages > 1 && (
            <nav className="pagination" aria-label="Products pagination">
              <button type="button" className="pagination-button" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                Previous
              </button>
              {pageWindow[0] > 1 && (
                <>
                  <button type="button" className="pagination-button" onClick={() => handlePageChange(1)}>
                    1
                  </button>
                  {pageWindow[0] > 2 && <span className="pagination-ellipsis">…</span>}
                </>
              )}
              {pageWindow.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination-button${page === currentPage ? ' is-active' : ''}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              {pageWindow[pageWindow.length - 1] < totalPages && (
                <>
                  {pageWindow[pageWindow.length - 1] < totalPages - 1 && <span className="pagination-ellipsis">…</span>}
                  <button type="button" className="pagination-button" onClick={() => handlePageChange(totalPages)}>
                    {totalPages}
                  </button>
                </>
              )}
              <button type="button" className="pagination-button" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                Next
              </button>
            </nav>
          )}
        </div>
      )}
      <div className="product-grid">
        {products.map((product) => {
          const ownedLabel = customerStateLabel(product);
          const wishlisted = isInWishlist(product.productId);
          const wishlistBusy = isWishlistBusy(product.productId);

          return (
            <article className="product-card" key={product.productId}>
              <div className="product-meta">{categoryTrail(product)}</div>
              <h3>{product.description || product.productId}</h3>
              <div className="product-id">{product.productId}</div>
              <div className="price">{product.price || '—'}</div>
              <div className="badges">
                {product.isDownloadable && <span className="badge">Downloadable</span>}
                {product.status && <span className="badge subtle">{product.status}</span>}
                {ownedLabel && <span className="badge badge-accent">{ownedLabel}</span>}
                {product.thirdParty?.rating && <span className="badge subtle">3rd-party ★ {product.thirdParty.rating}</span>}
              </div>
              {product.thirdParty?.description && <p className="muted compact-copy">{product.thirdParty.description}</p>}
              <div className="product-actions">
                <Link to={`/products/${encodeURIComponent(product.productId)}`}>Open</Link>
                <button type="button" disabled={busyProductId === product.productId} onClick={() => void handleAddToCart(product.productId)}>
                  {busyProductId === product.productId ? 'Adding…' : 'Add to cart'}
                </button>
                <button
                  type="button"
                  className={`button-secondary wishlist-toggle${wishlisted ? ' is-active' : ''}`}
                  aria-pressed={wishlisted}
                  disabled={wishlistBusy}
                  onClick={() => void handleToggleWishlist(product.productId)}
                >
                  {wishlistBusy ? 'Saving…' : wishlisted ? '♥ Wishlisted' : '♡ Wishlist'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
