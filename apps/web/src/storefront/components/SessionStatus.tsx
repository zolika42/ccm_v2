/**
 * @fileoverview Session status pill that shows guest or signed-in storefront state.
 */
import { useAuth } from '../../auth/AuthContext';

export function SessionStatus() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();

  if (authLoading) {
    return <span className="session-pill muted-pill">Loading session…</span>;
  }

  const userLabel = isAuthenticated && user ? `Signed in as ${user.name || user.email}` : 'Guest session';
  return <span className="session-pill">{userLabel}</span>;
}
