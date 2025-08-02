/** @format */

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import type { User } from '@/lib/models';
import {
  ADMIN_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  LIBRARIAN_PERMISSIONS,
  PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
} from '@/lib/auth';

const secret = process.env.NEXTAUTH_SECRET;

if (!secret) {
  throw new Error('NEXTAUTH_SECRET is not set in environment variables');
}

const getToken = async (req: NextRequest) => {
  try {
    const { getToken: _getToken } = await import('next-auth/jwt');
    return await _getToken({ req, secret });
  } catch (error) {
    console.error('Token extraction error:', error);
    return null;
  }
};

export async function authMiddleware(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return null;
  }

  const token = await getToken(req);

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'No valid authentication token' },
      { status: 401 }
    );
  }

  if (!token.email || !token.sub) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid token structure' },
      { status: 401 }
    );
  }

  return null;
}

export async function getUserPermissions(req: NextRequest): Promise<string[]> {
  const token = await getToken(req);

  if (!token?.email) {
    return [];
  }

  try {
    const db = await getDatabase();
    const user = await db
      .collection<User>('users')
      .findOne({ email: token.email });

    if (!user) {
      console.warn(`User not found: ${token.email}`);
      return [];
    }

    const allPermissions = [
      ...(user.permissions || []),
      ...getDefaultPermissionsForRole(user.role),
    ];

    return [...new Set(allPermissions)];
  } catch (error) {
    console.error('Permission fetch error:', error);
    return [];
  }
}

function getDefaultPermissionsForRole(role?: string): string[] {
  switch (role) {
    case 'Super Admin':
      return SUPER_ADMIN_PERMISSIONS;
    case 'Admin':
      return ADMIN_PERMISSIONS;
    case 'Librarian':
      return LIBRARIAN_PERMISSIONS;
    default:
      return DEFAULT_USER_PERMISSIONS;
  }
}

export const requirePermission = (requiredPermission: string) => {
  return async (req: NextRequest) => {
    const userPermissions = await getUserPermissions(req);

    if (!userPermissions.includes(requiredPermission)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Insufficient permissions',
          required: requiredPermission,
          has: userPermissions,
          user: (await getToken(req))?.email,
        },
        { status: 403 }
      );
    }

    return null;
  };
};
