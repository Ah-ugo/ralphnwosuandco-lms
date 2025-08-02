/** @format */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import type { User } from '@/lib/models';
import { DEFAULT_USER_PERMISSIONS } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const newUser: User = {
      name,
      email,
      password: hashedPassword,
      role: 'User',
      permissions: DEFAULT_USER_PERMISSIONS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json(
      {
        message: 'User registered successfully',
        userId: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
