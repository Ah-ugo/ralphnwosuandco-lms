/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Document } from '@/lib/models';
import { ObjectId } from 'mongodb';

/**
 * @swagger
 * /api/documents/case/{caseId}:
 *   get:
 *     tags: [Documents]
 *     summary: Get documents by Case ID
 *     description: Retrieve a list of documents associated with a specific case.
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the case to retrieve documents for.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid Case ID format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(PERMISSIONS.DOCUMENTS_READ)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const { caseId } = params;

    if (!ObjectId.isValid(caseId)) {
      return NextResponse.json(
        { error: 'Invalid Case ID format' },
        { status: 400 }
      );
    }

    const caseObjectId = new ObjectId(caseId);
    const documents = await db
      .collection<Document>('documents')
      .find({ caseId: caseObjectId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      documents.map((doc) => ({
        ...doc,
        _id: doc._id?.toString(),
        caseId: doc.caseId?.toString(),
      }))
    );
  } catch (error) {
    console.error('Error fetching documents by case ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
