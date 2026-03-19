/**
 * @fileoverview Authenticated digital library screen using storefront catalog cards for owned downloads.
 */
import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLibrary, getLibraryDownloadUrl } from '../api/client';
import { resolveCatalogMediaUrl } from '../catalog/catalogMedia';
import { StoreCollectionCard } from '../catalog/components/StoreCollectionCard';
import type { LibraryState } from '../types';

function libraryCategoryLabel(item: LibraryState['items'][number]) {
  return [item.category, item.subCategory].filter(Boolean).join(' / ');
}

function librarySummary(item: LibraryState['items'][number]) {
  const bits = [item.status, item.releaseDate ? `Release: ${item.releaseDate}` : ''].filter(Boolean);
  return bits.join(' · ');
}

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
          <p className="muted">Please sign in to access your owned downloads.</p>
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
            <button type="button" onClick={() => void loadLibrary()}>Refresh library</button>
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
            <p className="muted">{library.meta.count} owned download{library.meta.count === 1 ? '' : 's'} ready in your library.</p>
          </div>
          <button type="button" className="button-secondary" onClick={() => void loadLibrary()}>Refresh library</button>
        </div>
      </div>

      <div className="library-grid product-grid-catalog">
        {library.items.map((item) => (
          <StoreCollectionCard
            key={item.productId}
            href={`/products/${encodeURIComponent(item.productId)}`}
            title={item.description}
            productId={item.productId}
            categoryLabel={libraryCategoryLabel(item)}
            priceLabel={item.price || '—'}
            summary={librarySummary(item)}
            imageUrl={resolveCatalogMediaUrl(item.image)}
            imageAlt={item.description}
            cornerBadge={item.hasDownloadFile ? 'Owned download' : 'Owned item'}
            badges={(
              <>
                <span className="badge">Owned × {item.quantity}</span>
                {item.hasDownloadFile ? <span className="badge badge-accent">Ready to download</span> : <span className="badge subtle">File pending</span>}
                {item.downloadableFilename ? <span className="badge subtle">{item.downloadableFilename}</span> : null}
              </>
            )}
            actions={(
              <>
                <Link className="button-link button-link-secondary" to={`/products/${encodeURIComponent(item.productId)}`}>View product</Link>
                {item.hasDownloadFile ? (
                  <a className="button-link" href={getLibraryDownloadUrl(item.productId)}>Download now</a>
                ) : (
                  <span className="button-link button-link-secondary disabled-action" aria-disabled="true">Download pending</span>
                )}
              </>
            )}
          />
        ))}
      </div>
    </section>
  );
}
