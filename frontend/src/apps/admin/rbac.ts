import type { CurrentUser, SystemRole } from '../../lib/types';

// Ported verbatim from the prototype's PAGE_ACCESS table.
interface PageAccess {
  roles: SystemRole[];
  module?: string;
  deptModule?: string;
}

export const PAGE_ACCESS: Record<string, PageAccess> = {
  '': { roles: ['super_admin', 'management', 'module_admin', 'dept_manager', 'operator'] },
  register: { roles: ['super_admin', 'management', 'module_admin'], module: 'vms' },
  guests: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'], module: 'vms', deptModule: 'guests' },
  staff: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'], module: 'vms', deptModule: 'staff' },
  seva: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'], module: 'vms', deptModule: 'seva' },
  students: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'], module: 'vms', deptModule: 'students' },
  contractors: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'], module: 'vms', deptModule: 'contractors' },
  vendors: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'], module: 'vms', deptModule: 'vendors' },
  ashram: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'], module: 'vms', deptModule: 'ashram' },
  annakshetra: { roles: ['super_admin', 'management', 'module_admin'], module: 'ams' },
  festival: { roles: ['super_admin', 'management', 'module_admin'], module: 'vms' },
  security: { roles: ['super_admin', 'management', 'dept_manager'], module: 'security' },
  users: { roles: ['super_admin'] },
  settings: { roles: ['super_admin', 'management'] },
  audit: { roles: ['super_admin'] },
  org: { roles: ['super_admin', 'management', 'module_admin', 'dept_manager'] },
};

export function canAccess(pageId: string, user: CurrentUser | null): boolean {
  if (!user) return false;
  const access = PAGE_ACCESS[pageId];
  if (!access) return true;
  if (!access.roles.includes(user.role)) return false;
  const mods = user.module_access || [];
  if (user.role === 'module_admin' || user.role === 'operator') {
    if (access.module && !mods.includes(access.module)) return false;
  }
  if (user.role === 'dept_manager' && access.deptModule) {
    return mods.includes(access.deptModule);
  }
  return true;
}
