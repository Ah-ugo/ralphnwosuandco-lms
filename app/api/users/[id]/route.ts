/** @format */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import { ObjectId } from 'mongodb';

interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    permissions: string[];
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    // Users can view their own profile, admins can view any
    const isSelf = request.user?.id === params.id;
    if (!isSelf) {
      const permissionResponse = await requirePermission(
        PERMISSIONS.USERS_READ
      )(request);
      if (permissionResponse) return permissionResponse;
    }

    const db = await getDatabase();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const user = await db
      .collection('users')
      .findOne({ _id: new ObjectId(id) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove sensitive data
    const { password, resetToken, resetTokenExpires, ...userData } = user;

    return NextResponse.json({
      ...userData,
      _id: userData._id.toString(),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    // Users can update their own profile, admins can update any
    const isSelf = request.user?.id === params.id;
    if (!isSelf) {
      const permissionResponse = await requirePermission(
        PERMISSIONS.USERS_UPDATE
      )(request);
      if (permissionResponse) return permissionResponse;
    }

    const db = await getDatabase();
    const { id } = params;
    const updateData = await request.json();

    console.log(`Attempting to update user ${id} with data:`, updateData);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Non-admins can't change their role or permissions
    if (
      !isSelf &&
      !(request as AuthenticatedRequest).user?.permissions.includes(
        PERMISSIONS.USERS_UPDATE
      )
    ) {
      delete updateData.role;
      delete updateData.permissions;
    }

    const updatePayload: any = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Verify user exists first
    const existingUser = await db
      .collection('users')
      .findOne({ _id: new ObjectId(id) });

    if (!existingUser) {
      console.log(`User ${id} not found`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Perform the update
    const updateResult = await db
      .collection('users')
      .updateOne({ _id: new ObjectId(id) }, { $set: updatePayload });

    console.log(`Update result for user ${id}:`, updateResult);

    if (updateResult.modifiedCount === 0) {
      console.log(`No changes made to user ${id}`);
      return NextResponse.json(
        { message: 'No changes were made' },
        { status: 200 }
      );
    }

    // Fetch the updated user
    const updatedUser = await db
      .collection('users')
      .findOne({ _id: new ObjectId(id) });

    if (!updatedUser) {
      console.error(`User ${id} not found after update`);
      return NextResponse.json(
        { error: 'User not found after update' },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const { password, resetToken, resetTokenExpires, ...userData } =
      updatedUser;

    console.log(`Successfully updated user ${id}`);
    return NextResponse.json({
      ...userData,
      _id: userData._id.toString(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.USERS_DELETE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Prevent deleting self
    if (request.user?.id === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const result = await db
      .collection('users')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
