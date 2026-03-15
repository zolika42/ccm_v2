import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLibrary } from '../api/client';
import type { LibraryState } from '../types';

export function LibraryPage() {
  const [library, setLibrary] = useState<LibraryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  async function loadLibrary() {
    setLoading(true);
    setError(null);
    try {
      const payload = await getLibrary();
      if (!payload.ok) {
        setNeedsLogin(true);
        setLibrary(null);
        return;
      }
      setNeedsLogin(false);
      setLibrary(payload.data ?? null);
    } catch (err) {
      setNeedsLogin(false);
      setError(err instanceof Error ? err.message : 'Library request failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLibrary();
  }, []);

  if (loading) {
    return <p>Loading library…</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (needsLogin) {
    return (
      <section className="stack">
        <div className="panel">
          <h2>Digital library</h2>
          <p className="muted">The library is tied to the logged-in customer account.</p>
        </div>
        <div className="result-card">
          <p className="error">Please log in to view owned downloads.</p>
          <Link className="button-link" to="/login">Go to login</Link>
        </div>
      </section>
    );
  }

  if (!library || !library.meta.hasItems) {
    return (
      <section className="stack">
        <div className="panel">
          <div className="page-header">
            <div>
              <h2>Digital library</h2>
              <p className="muted">Owned downloadable titles will appear here after purchase.</p>
            </div>
            <button type="button" onClick={() => void loadLibrary()}>Reload library</button>
          </div>
          <div className="result-card">
            <p>No downloadable purchases were found for this account yet.</p>
            <Link to="/products">Browse products</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="panel">
        <div className="page-header">
          <div>
            <h2>Digital library</h2>
            <p className="muted">Customer <code>{library.customerId}</code> · {library.meta.count} owned download{library.meta.count === 1 ? '' : 's'}</p>
          </div>
          <button type="button" onClick={() => void loadLibrary()}>Reload library</button>
        </div>

        <div className="library-grid">
          {library.items.map((item) => (
            <article key={item.productId} className="library-card">
              <div className="stack compact-stack">
                <div className="row wrap-row library-card-header">
                  <div>
                    <h3>{item.description}</h3>
                    <div className="product-id">{item.productId}</div>
                  </div>
                  <div className="badges">
                    <span className="badge">Owned × {item.quantity}</span>
                    {item.hasDownloadFile ? <span className="badge">Download file present</span> : <span className="badge subtle">No file mapped yet</span>}
                  </div>
                </div>

                <dl className="summary-list library-meta-list">
                  <div><dt>Category</dt><dd>{item.category || '—'}</dd></div>
                  <div><dt>Subcategory</dt><dd>{item.subCategory || '—'}</dd></div>
                  <div><dt>Filename</dt><dd><code>{item.downloadableFilename || '—'}</code></dd></div>
                  <div><dt>Status</dt><dd>{item.status || '—'}</dd></div>
                  <div><dt>Release</dt><dd>{item.releaseDate || '—'}</dd></div>
                </dl>

                <div className="row wrap-row">
                  <Link className="button-link" to={`/products/${encodeURIComponent(item.productId)}`}>View product</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
