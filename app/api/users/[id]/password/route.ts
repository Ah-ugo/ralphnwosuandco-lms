/** @format */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware } from '@/lib/middleware';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const db = await getDatabase();
    const { id } = params;
    const { currentPassword, newPassword, adminOverride } =
      await request.json();

    // Validate input
    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = await db
      .collection('users')
      .findOne({ _id: new ObjectId(id) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if requester is admin
    const isAdmin = request.user?.role === 'admin';

    // Authorization check
    if (!isAdmin && request.user?.id !== id) {
      return NextResponse.json(
        { error: 'You can only update your own password' },
        { status: 403 }
      );
    }

    // Password verification for non-admin or admin changing their own password
    if (!isAdmin || (isAdmin && request.user?.id === id)) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        );
      }

      const passwordMatch = await verifyPassword(
        currentPassword,
        user.password
      );
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    // Additional confirmation for admin changing another user's password
    if (isAdmin && request.user?.id !== id && adminOverride !== true) {
      return NextResponse.json(
        {
          error:
            'Admin override required. Set adminOverride: true to confirm password change',
          requiresAdminOverride: true,
        },
        { status: 403 }
      );
    }

    // Hash and update the new password
    const hashedPassword = await hashPassword(newPassword);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
          resetToken: null,
          resetTokenExpires: null,
        },
      }
    );

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}
