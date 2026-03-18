/**
 * @fileoverview Default rewrite storefront header for non-legacy themed pages.
 */
import { SessionStatus } from './SessionStatus';
import { StorefrontTopNav } from './StorefrontTopNav';

export function RewriteStorefrontHeader() {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <h1 className="brand">ColumbiaGames Rewrite</h1>
        <div className="topbar-meta">
          <SessionStatus />
          <StorefrontTopNav />
        </div>
      </div>
    </header>
  );
}
