import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../api/client';
import type { Product } from '../types';

export function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(search = '') {
    setLoading(true);
    setError(null);
    try {
      const response = await listProducts({ q: search, limit: 30, offset: 0 });
      setProducts(response.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <div className="page-header">
        <h2>Products</h2>
        <div className="row search-row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" />
          <button onClick={() => load(query)}>Search</button>
        </div>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.productId}>
            <div className="product-meta">{product.category} / {product.subCategory}</div>
            <h3>{product.description || product.productId}</h3>
            <div className="product-id">{product.productId}</div>
            <div className="price">{product.price || '—'}</div>
            <div className="badges">
              {product.isDownloadable && <span className="badge">Downloadable</span>}
              {product.status && <span className="badge subtle">{product.status}</span>}
            </div>
            <Link to={`/products/${encodeURIComponent(product.productId)}`}>Open</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
