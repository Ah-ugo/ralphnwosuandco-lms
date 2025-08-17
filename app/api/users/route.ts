/** @format */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { sendEmail } from '@/lib/email';
import {
  generateRandomPassword,
  generateRandomToken,
  isValidEmail,
} from '@/lib/utils';
import { hashPassword } from '@/lib/auth';

interface User {
  _id: ObjectId;
  email: string;
  name?: string;
  role: string;
  permissions: string[];
  password?: string;
  resetToken?: string;
  resetTokenExpires?: Date;
  invitationToken?: string;
  invitationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// GET all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(PERMISSIONS.USERS_READ)(
      request
    );
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await db
      .collection<User>('users')
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    const total = await db.collection<User>('users').countDocuments(query);

    return NextResponse.json({
      users: users.map((user) => ({
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Create new user or send invitation (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.USERS_CREATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { email, name, role, sendInvitation } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.collection<User>('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Set permissions based on role
    let permissions: string[] = [];
    switch (role) {
      case 'Super Admin':
        permissions = ROLE_PERMISSIONS.SUPER_ADMIN_PERMISSIONS;
        break;
      case 'Admin':
        permissions = ROLE_PERMISSIONS.ADMIN_PERMISSIONS;
        break;
      case 'Librarian':
        permissions = ROLE_PERMISSIONS.LIBRARIAN_PERMISSIONS;
        break;
      default:
        permissions = ROLE_PERMISSIONS.DEFAULT_USER_PERMISSIONS;
    }

    if (sendInvitation) {
      // Create invitation flow
      const invitationToken = generateRandomToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const newUser = {
        email,
        name,
        role,
        permissions,
        invitationToken,
        invitationExpires: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection<User>('users').insertOne(newUser);

      // Send invitation email
      const invitationLink = `${process.env.NEXTAUTH_URL}/auth/invite?token=${invitationToken}`;
      await sendEmail({
        to: email,
        subject: `You've been invited to ${
          process.env.APP_NAME || 'the system'
        }`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>You've been invited!</h2>
            <p>Hello${name ? ` ${name}` : ''},</p>
            <p>You've been invited to join ${
              process.env.APP_NAME || 'our system'
            } as a ${role}.</p>
            <p>Please click the link below to complete your registration:</p>
            <p><a href="${invitationLink}" style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Registration</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });

      return NextResponse.json(
        { message: 'Invitation sent successfully' },
        { status: 201 }
      );
    } else {
      // Create user directly (for admin creating accounts)
      const temporaryPassword = generateRandomPassword();
      const hashedPassword = await hashPassword(temporaryPassword);

      const newUser = {
        email,
        name,
        role,
        permissions,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection<User>('users').insertOne(newUser);

      // Send welcome email with temporary password
      await sendEmail({
        to: email,
        subject: `Your ${
          process.env.APP_NAME || 'system'
        } account has been created`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Account Created</h2>
            <p>Hello${name ? ` ${name}` : ''},</p>
            <p>Your account has been created with the role: <strong>${role}</strong>.</p>
            <p>Your temporary password is: <strong>${temporaryPassword}</strong></p>
            <p>Please log in and change your password immediately.</p>
            <p><a href="${
              process.env.NEXTAUTH_URL
            }/auth/login" style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Log In Now</a></p>
            <p>If you didn't request this, please contact your administrator immediately.</p>
          </div>
        `,
      });

      return NextResponse.json(
        { message: 'User created successfully' },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
