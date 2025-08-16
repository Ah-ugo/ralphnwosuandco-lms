/** @format */
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

  // New: Case Management
  CASES_READ: 'cases:read',
  CASES_CREATE: 'cases:create',
  CASES_UPDATE: 'cases:update',
  CASES_DELETE: 'cases:delete',

  // New: Document Management
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_UPDATE: 'documents:update',
  DOCUMENTS_DELETE: 'documents:delete',
};

export const SUPER_ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

export const ADMIN_PERMISSIONS = [
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

export const LIBRARIAN_PERMISSIONS = [
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
  PERMISSIONS.CASES_READ, // Librarians can view cases
  PERMISSIONS.DOCUMENTS_READ, // Librarians can view documents
];

export const DEFAULT_USER_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.BOOKS_READ,
  PERMISSIONS.BORROWERS_READ,
  PERMISSIONS.LENDINGS_READ,
  PERMISSIONS.NOTIFICATIONS_READ,
  PERMISSIONS.CASES_READ, // Users can view cases
  PERMISSIONS.DOCUMENTS_READ, // Users can view documents
];

export const hasPermissions = (
  userPermissions: string[],
  requiredPermissions: string[]
) => {
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
};
