import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';

interface RequireAuthProps {
  children: ReactNode;
  fallback: ReactNode; // each app's own login screen — no shared /login route
}

// Deliberately doesn't redirect via react-router: Gate/Canteen are
// single-URL kiosk apps where "logged out" is just a different internal
// screen, not a different route. Admin/Dashboard use the same component for
// consistency even though they do have real routes — login there is also
// just "what renders when there's no user yet", not its own page.
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <>{fallback}</>;
  return <>{children}</>;
}
