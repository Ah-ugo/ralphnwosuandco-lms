/** @format */

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Book } from '@/lib/models';

/**
 * @swagger
 * /api/books/available:
 *   get:
 *     tags: [Books]
 *     summary: Get all available books
 *     description: Retrieve a list of books that have at least one available copy.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available books retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
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

    const permissionError = await requirePermission(PERMISSIONS.BOOKS_READ)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const availableBooks = await db
      .collection<Book>('books')
      .find({ availableCopies: { $gt: 0 } })
      .toArray();

    return NextResponse.json(
      availableBooks.map((b) => ({ ...b, _id: b._id?.toString() }))
    );
  } catch (error) {
    console.error('Error fetching available books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available books' },
      { status: 500 }
    );
  }
}
