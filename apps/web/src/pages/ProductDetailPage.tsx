import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProduct, getRelated } from '../api/client';
import type { Product } from '../types';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [productResponse, relatedResponse] = await Promise.all([
          getProduct(productId),
          getRelated(productId),
        ]);
        setProduct(productResponse.data);
        setRelated(relatedResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      }
    }

    void load();
  }, [productId]);

  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <section className="panel">
      <div className="detail-header">
        <div>
          <div className="product-id">{product.productId}</div>
          <h2>{product.description || product.productId}</h2>
          <div className="muted">{product.category} / {product.subCategory}</div>
        </div>
        <div className="price big">{product.price || '—'}</div>
      </div>

      <div className="stack">
        {product.extendedDescription && <p>{product.extendedDescription}</p>}
        {product.specs && (
          <div>
            <h3>Specs</h3>
            <pre>{product.specs}</pre>
          </div>
        )}
        {product.resources && (
          <div>
            <h3>Resources</h3>
            <pre>{product.resources}</pre>
          </div>
        )}
        <div className="badges">
          {product.isDownloadable && <span className="badge">Downloadable</span>}
          {product.releaseDate && <span className="badge subtle">Release: {product.releaseDate}</span>}
        </div>
      </div>

      <div>
        <h3>Related products</h3>
        {related.length === 0 ? <p className="muted">No related products found.</p> : (
          <ul>
            {related.map((item) => (
              <li key={item.productId}>{item.productId} — {item.description || item.productId}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
