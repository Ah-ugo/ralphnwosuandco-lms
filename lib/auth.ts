/** @format */
import bcrypt from 'bcryptjs';

// Permission constants
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: 'dashboard:read',

  // Books
  BOOKS_READ: 'books:read',
  BOOKS_CREATE: 'books:create',
  BOOKS_UPDATE: 'books:update',
  BOOKS_DELETE: 'books:delete',

  // Borrowers
  BORROWERS_READ: 'borrowers:read',
  BORROWERS_CREATE: 'borrowers:create',
  BORROWERS_UPDATE: 'borrowers:update',
  BORROWERS_DELETE: 'borrowers:delete',

  // Lendings
  LENDINGS_READ: 'lendings:read',
  LENDINGS_CREATE: 'lendings:create',
  LENDINGS_UPDATE: 'lendings:update',
  LENDINGS_DELETE: 'lendings:delete',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',

  // Users
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Notifications
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_CREATE: 'notifications:create',
  NOTIFICATIONS_UPDATE: 'notifications:update',
  NOTIFICATIONS_DELETE: 'notifications:delete',

  // API Docs
  API_DOCS_READ: 'api_docs:read',

  // Case Management
  CASES_READ: 'cases:read',
  CASES_CREATE: 'cases:create',
  CASES_UPDATE: 'cases:update',
  CASES_DELETE: 'cases:delete',

  // Document Management
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_UPDATE: 'documents:update',
  DOCUMENTS_DELETE: 'documents:delete',
} as const;

// Type for permissions
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Permission groups
export const SUPER_ADMIN_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const ADMIN_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.BOOKS_READ,
  PERMISSIONS.BOOKS_CREATE,
  PERMISSIONS.BOOKS_UPDATE,
  PERMISSIONS.BOOKS_DELETE,
  PERMISSIONS.BORROWERS_READ,
  PERMISSIONS.BORROWERS_CREATE,
  PERMISSIONS.BORROWERS_UPDATE,
  PERMISSIONS.BORROWERS_DELETE,
  PERMISSIONS.LENDINGS_READ,
  PERMISSIONS.LENDINGS_CREATE,
  PERMISSIONS.LENDINGS_UPDATE,
  PERMISSIONS.LENDINGS_DELETE,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.REPORTS_EXPORT,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_DELETE,
  PERMISSIONS.API_DOCS_READ,
  PERMISSIONS.CASES_READ,
  PERMISSIONS.CASES_CREATE,
  PERMISSIONS.CASES_UPDATE,
  PERMISSIONS.CASES_DELETE,
  PERMISSIONS.DOCUMENTS_READ,
  PERMISSIONS.DOCUMENTS_CREATE,
  PERMISSIONS.DOCUMENTS_UPDATE,
  PERMISSIONS.DOCUMENTS_DELETE,
];

export const LIBRARIAN_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.BOOKS_READ,
  PERMISSIONS.BOOKS_CREATE,
  PERMISSIONS.BOOKS_UPDATE,
  PERMISSIONS.BORROWERS_READ,
  PERMISSIONS.BORROWERS_CREATE,
  PERMISSIONS.BORROWERS_UPDATE,
  PERMISSIONS.LENDINGS_READ,
  PERMISSIONS.LENDINGS_CREATE,
  PERMISSIONS.LENDINGS_UPDATE,
  PERMISSIONS.REPORTS_READ,
  PERMISSIONS.CASES_READ,
  PERMISSIONS.DOCUMENTS_READ,
];

export const DEFAULT_USER_PERMISSIONS: Permission[] = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.BOOKS_READ,
  PERMISSIONS.BORROWERS_READ,
  PERMISSIONS.LENDINGS_READ,
  PERMISSIONS.NOTIFICATIONS_READ,
  PERMISSIONS.CASES_READ,
  PERMISSIONS.DOCUMENTS_READ,
];

// Permission checking utility
export const hasPermissions = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
};

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Super Admin': SUPER_ADMIN_PERMISSIONS,
  Admin: ADMIN_PERMISSIONS,
  Librarian: LIBRARIAN_PERMISSIONS,
  User: DEFAULT_USER_PERMISSIONS,
};
