/**
 * @fileoverview Legacy storefront header with branding, search, session status, and nav.
 */
import { LegacyHeaderSearch } from './LegacyHeaderSearch';
import { SessionStatus } from './SessionStatus';
import { StorefrontTopNav } from './StorefrontTopNav';

export function LegacyStorefrontHeader() {
  return (
    <header className="topbar legacy-topbar">
      <div className="container topbar-inner legacy-topbar-inner">
        <div className="legacy-branding">
          <div>
            <div className="brand brand-legacy">Columbia Games</div>
          </div>
        </div>
        <div className="topbar-meta legacy-topbar-meta">
          <LegacyHeaderSearch />
          <SessionStatus />
          <StorefrontTopNav />
        </div>
      </div>
    </header>
  );
}
