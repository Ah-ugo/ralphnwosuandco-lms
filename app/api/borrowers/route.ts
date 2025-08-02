/** @format */

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Borrower } from '@/lib/models';

/**
 * @swagger
 * /api/borrowers:
 *   get:
 *     tags: [Borrowers]
 *     summary: Get all borrowers
 *     description: Retrieve a list of all borrowers with pagination and search capabilities.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for name, email, or member ID.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of borrowers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 borrowers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Borrower'
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *   post:
 *     tags: [Borrowers]
 *     summary: Create a new borrower
 *     description: Add a new borrower to the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - role
 *               - phone
 *               - memberId
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               memberId:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Borrower created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Borrower'
 *       400:
 *         description: Invalid input or member ID already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(PERMISSIONS.BORROWERS_READ)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '10');
    const searchQuery = searchParams.get('search') || '';

    const query: any = {};
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { memberId: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const borrowers = await db
      .collection<Borrower>('borrowers')
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await db
      .collection<Borrower>('borrowers')
      .countDocuments(query);

    return NextResponse.json({
      borrowers: borrowers.map((b) => ({ ...b, _id: b._id?.toString() })),
      total,
    });
  } catch (error) {
    console.error('Error fetching borrowers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrowers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(
      PERMISSIONS.BORROWERS_CREATE
    )(request);
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const body = await request.json();
    const { name, role, phone, email, memberId } = body;

    if (!name || !role || !phone || !memberId) {
      return NextResponse.json(
        { error: 'Name, Role, Phone, and Member ID are required' },
        { status: 400 }
      );
    }

    const existingBorrower = await db
      .collection<Borrower>('borrowers')
      .findOne({ memberId });
    if (existingBorrower) {
      return NextResponse.json(
        { error: 'Borrower with this Member ID already exists' },
        { status: 400 }
      );
    }

    const newBorrower: Borrower = {
      name,
      role,
      phone,
      email: email || '',
      memberId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection<Borrower>('borrowers')
      .insertOne(newBorrower);

    return NextResponse.json(
      { ...newBorrower, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating borrower:', error);
    return NextResponse.json(
      { error: 'Failed to create borrower' },
      { status: 500 }
    );
  }
}
