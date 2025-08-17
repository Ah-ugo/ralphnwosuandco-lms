/** @format */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';
import { generateRandomToken } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await db.collection('users').findOne({ email });

    // Don't reveal if user exists or not
    if (!user) {
      return NextResponse.json(
        {
          message:
            'If an account exists with this email, a reset link has been sent',
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken,
          resetTokenExpires: expiresAt,
        },
      }
    );

    // Send reset email
    const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset</h2>
          <p>We received a request to reset your password.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: 'Password reset link sent' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
