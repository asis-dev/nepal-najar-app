export const ALL_APP_ROLES = ['observer', 'citizen', 'verifier', 'admin'] as const;
export const TWO_LEVEL_APP_ROLES = ['citizen', 'admin'] as const;

export type AppRole = (typeof ALL_APP_ROLES)[number];
export type AppRoleTier = 'standard' | 'elevated';

const ROLE_LABELS: Record<AppRole, string> = {
  observer: 'Observer',
  citizen: 'Citizen',
  verifier: 'Verifier',
  admin: 'Admin',
};

function extendedRolesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_EXTENDED_ROLES === 'true';
}

export function isValidAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && ALL_APP_ROLES.includes(value as AppRole);
}

export function getAssignableRoles(): AppRole[] {
  if (extendedRolesEnabled()) {
    return [...ALL_APP_ROLES];
  }
  return [...TWO_LEVEL_APP_ROLES];
}

export function normalizeAppRole(value: unknown, fallback: AppRole = 'citizen'): AppRole {
  if (!isValidAppRole(value)) return fallback;
  if (extendedRolesEnabled()) return value;
  return value === 'admin' ? 'admin' : 'citizen';
}

export function getRoleLabel(role: string | null | undefined): string {
  const normalized = normalizeAppRole(role);
  return ROLE_LABELS[normalized];
}

export function isElevatedRole(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  if (normalized === 'admin') return true;
  return extendedRolesEnabled() && normalized === 'verifier';
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'admin';
}

export function getRoleTier(role: string | null | undefined): AppRoleTier {
  return isElevatedRole(role) ? 'elevated' : 'standard';
}
