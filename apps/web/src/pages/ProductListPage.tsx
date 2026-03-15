/**
 * @fileoverview Product catalog list page used as the storefront landing view.
 */
import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addCartItem } from '../api/client';
import { useCart } from '../cart/CartContext';
import { useCatalogCategories } from '../catalog/useCatalogCategories';
import { useCatalogProducts } from '../catalog/useCatalogProducts';

export function ProductListPage() {
  const [queryInput, setQueryInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const { refresh } = useCart();
  const categoryState = useCatalogCategories();
  const productState = useCatalogProducts({
    q: submittedQuery,
    category: selectedCategory,
    sub_category: selectedSubCategory,
    limit: 30,
    offset: 0,
  });

  const availableSubCategories = useMemo(
    () => categoryState.categories.find((category) => category.name === selectedCategory)?.subCategories ?? [],
    [categoryState.categories, selectedCategory],
  );

  useEffect(() => {
    setSelectedSubCategory((current) => {
      if (!current) {
        return current;
      }

      return availableSubCategories.some((item) => item.name === current) ? current : '';
    });
  }, [availableSubCategories]);

  async function handleAddToCart(productId: string) {
    setBusyProductId(productId);
    setMessage(null);
    try {
      await addCartItem(productId, 1);
      await refresh();
      setMessage(`${productId} added to cart.`);
    } catch (err) {
      productState.refetch().catch(() => undefined);
      setMessage(null);
      throw err;
    } finally {
      setBusyProductId(null);
    }
  }

  async function onAddToCart(productId: string) {
    try {
      await handleAddToCart(productId);
    } catch {
      // Product query hook already exposes the current error state for list loading.
    }
  }

  function handleSearchSubmit() {
    setSubmittedQuery(queryInput.trim());
  }

  function handleResetFilters() {
    setQueryInput('');
    setSubmittedQuery('');
    setSelectedCategory('');
    setSelectedSubCategory('');
    setMessage(null);
  }

  return (
    <section>
      <div className="page-header product-page-header">
        <div>
          <h2>Products</h2>
          <p className="muted">Catalog data is now cached in-memory per filter combination, so repeated views reuse the same typed API state.</p>
        </div>
        <button type="button" onClick={() => void productState.refetch()} disabled={productState.loading}>Refresh list</button>
      </div>

      <div className="panel stack filter-panel">
        <div className="filter-grid">
          <label>
            Search
            <input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="Search products…" />
          </label>
          <label>
            Category
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={categoryState.loading}>
              <option value="">All categories</option>
              {categoryState.categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name} ({category.productCount})
                </option>
              ))}
            </select>
          </label>
          <label>
            Sub-category
            <select value={selectedSubCategory} onChange={(e) => setSelectedSubCategory(e.target.value)} disabled={categoryState.loading || !selectedCategory}>
              <option value="">All sub-categories</option>
              {availableSubCategories.map((subCategory) => (
                <option key={subCategory.name} value={subCategory.name}>
                  {subCategory.name} ({subCategory.productCount})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row wrap-row">
          <button type="button" onClick={handleSearchSubmit} disabled={productState.loading}>Apply filters</button>
          <button type="button" onClick={handleResetFilters}>Reset</button>
          {categoryState.meta ? (
            <span className="muted">
              {categoryState.meta.categoryCount} categories / {categoryState.meta.subCategoryCount} sub-categories cached
            </span>
          ) : null}
        </div>

        {categoryState.error ? <p className="error">{categoryState.error}</p> : null}
      </div>

      {message && <p className="success">{message}</p>}
      {productState.loading && <p>Loading…</p>}
      {productState.error && <p className="error">{productState.error}</p>}
      {!productState.loading && !productState.error && productState.meta ? (
        <p className="muted">Showing {productState.products.length} of {productState.meta.total} products.</p>
      ) : null}

      <div className="product-grid">
        {productState.products.map((product) => (
          <article className="product-card" key={product.productId}>
            <div className="product-meta">{product.category} / {product.subCategory}</div>
            <h3>{product.description || product.productId}</h3>
            <div className="product-id">{product.productId}</div>
            <div className="price">{product.price || '—'}</div>
            <div className="badges">
              {product.isDownloadable && <span className="badge">Downloadable</span>}
              {product.status && <span className="badge subtle">{product.status}</span>}
            </div>
            <div className="product-actions">
              <Link to={`/products/${encodeURIComponent(product.productId)}`}>Open</Link>
              <button type="button" disabled={busyProductId === product.productId} onClick={() => void onAddToCart(product.productId)}>
                {busyProductId === product.productId ? 'Adding…' : 'Add to cart'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
