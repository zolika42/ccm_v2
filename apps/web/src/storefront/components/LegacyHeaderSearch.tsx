/**
 * @fileoverview Header search form that syncs the catalog query with the URL state.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DEFAULT_CATALOG_VIEW_STATE,
  buildCatalogHref,
  catalogViewStateFromSearchParams,
  readStoredCatalogViewState,
} from '../../catalog/catalogState';

export function LegacyHeaderSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const currentState = location.pathname.startsWith('/products')
      ? catalogViewStateFromSearchParams(new URLSearchParams(location.search))
      : readStoredCatalogViewState() ?? DEFAULT_CATALOG_VIEW_STATE;

    setQuery(currentState.q);
  }, [location.pathname, location.search]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const baseState = location.pathname.startsWith('/products')
      ? catalogViewStateFromSearchParams(new URLSearchParams(location.search))
      : readStoredCatalogViewState() ?? DEFAULT_CATALOG_VIEW_STATE;

    const nextState = {
      ...baseState,
      q: query.trim(),
      page: 1,
    };

    navigate(buildCatalogHref(nextState));
  }

  return (
    <form className="legacy-header-search" onSubmit={handleSubmit} role="search" aria-label="Storefront search">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products"
        aria-label="Search products"
      />
      <button type="submit">Search</button>
    </form>
  );
}
