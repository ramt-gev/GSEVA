import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { SystemRole } from '../lib/types';

interface RequireRoleProps {
  roles: SystemRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

// Generalized version of the Admin Portal prototype's PAGE_ACCESS/canAccess
// table — usable both for page-level gating (wrap a whole sidebar page) and
// inline gating (e.g. hiding the Gate app's Manual Override button for
// operator-role logins, since POST /api/gate/override is restricted
// server-side to super_admin/module_admin).
export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
