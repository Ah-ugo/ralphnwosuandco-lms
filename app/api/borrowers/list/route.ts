/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Borrower } from '@/lib/models';

/**
 * @swagger
 * /api/borrowers/list:
 *   get:
 *     tags: [Borrowers]
 *     summary: Get a simplified list of all borrowers
 *     description: Retrieve a list of all borrowers, primarily for selection in lending forms.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of borrowers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     format: objectId
 *                   name:
 *                     type: string
 *                   memberId:
 *                     type: string
 *                   role:
 *                     type: string
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
    const borrowers = await db
      .collection<Borrower>('borrowers')
      .find({})
      .project({ name: 1, memberId: 1, role: 1 })
      .toArray();

    return NextResponse.json(
      borrowers.map((b) => ({ ...b, _id: b._id?.toString() }))
    );
  } catch (error) {
    console.error('Error fetching borrowers list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrowers list' },
      { status: 500 }
    );
  }
}
