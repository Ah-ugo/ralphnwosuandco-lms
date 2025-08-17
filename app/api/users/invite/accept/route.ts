/** @format */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Token, name, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const user = await db.collection('users').findOne({
      invitationToken: token,
      invitationExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          name,
          password: hashedPassword,
          updatedAt: new Date(),
          invitationToken: null,
          invitationExpires: null,
        },
      }
    );

    return NextResponse.json(
      { message: 'Account setup complete. You can now log in.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to complete account setup' },
      { status: 500 }
    );
  }
}
