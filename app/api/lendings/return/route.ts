/** @format */

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { LendingRecord, Book } from '@/lib/models';

/**
 * @swagger
 * /api/lendings/return:
 *   post:
 *     tags: [Lendings]
 *     summary: Mark a book as returned
 *     description: Updates a lending record to 'returned' status and increments available book copies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lendingId
 *             properties:
 *               lendingId:
 *                 type: string
 *                 description: The ID of the lending record to mark as returned.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Book successfully returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LendingRecord'
 *       400:
 *         description: Invalid input or book already returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lending record not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(
      PERMISSIONS.LENDINGS_UPDATE
    )(request);
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const body = await request.json();
    const { lendingId } = body;

    if (!lendingId) {
      return NextResponse.json(
        { error: 'Lending ID is required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(lendingId)) {
      return NextResponse.json(
        { error: 'Invalid Lending ID' },
        { status: 400 }
      );
    }

    const lendingObjectId = new ObjectId(lendingId);

    const lendingRecord = await db
      .collection<LendingRecord>('lendings')
      .findOne({ _id: lendingObjectId });

    if (!lendingRecord) {
      return NextResponse.json(
        { error: 'Lending record not found' },
        { status: 404 }
      );
    }

    if (lendingRecord.status === 'returned') {
      return NextResponse.json(
        { error: 'Book already returned' },
        { status: 400 }
      );
    }

    const result = await db
      .collection<LendingRecord>('lendings')
      .findOneAndUpdate(
        { _id: lendingObjectId },
        {
          $set: {
            status: 'returned',
            returnDate: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return NextResponse.json(
        { error: 'Failed to update lending record' },
        { status: 500 }
      );
    }

    await db
      .collection<Book>('books')
      .updateOne(
        { _id: lendingRecord.bookId },
        { $inc: { availableCopies: 1 } }
      );

    return NextResponse.json({
      ...result.value,
      _id: result.value._id.toString(),
    });
  } catch (error) {
    console.error('Error returning book:', error);
    return NextResponse.json(
      { error: 'Failed to return book' },
      { status: 500 }
    );
  }
}
