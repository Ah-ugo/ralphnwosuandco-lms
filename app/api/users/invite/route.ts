/** @format */
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import { sendInvitationEmail } from '@/lib/email';
import { generateRandomToken } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.USERS_CREATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create invitation token
    const invitationToken = generateRandomToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.collection('users').insertOne({
      email,
      role,
      invitationToken,
      invitationExpires: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send invitation email
    await sendInvitationEmail(email, invitationToken);

    return NextResponse.json(
      { message: 'Invitation sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
