export enum UserRole {
  CITIZEN = 'citizen',
  VERIFIED_CITIZEN = 'verified_citizen',
  PROJECT_OFFICER = 'project_officer',
  BRANCH_MANAGER = 'branch_manager',
  DEPARTMENT_ADMIN = 'department_admin',
  MINISTRY_ADMIN = 'ministry_admin',
  NATIONAL_OVERSIGHT_ADMIN = 'national_oversight_admin',
  INDEPENDENT_VERIFIER = 'independent_verifier',
  SUPER_ADMIN = 'super_admin',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CITIZEN]: 0,
  [UserRole.VERIFIED_CITIZEN]: 1,
  [UserRole.PROJECT_OFFICER]: 2,
  [UserRole.BRANCH_MANAGER]: 3,
  [UserRole.DEPARTMENT_ADMIN]: 4,
  [UserRole.MINISTRY_ADMIN]: 5,
  [UserRole.NATIONAL_OVERSIGHT_ADMIN]: 6,
  [UserRole.INDEPENDENT_VERIFIER]: 3,
  [UserRole.SUPER_ADMIN]: 10,
};
