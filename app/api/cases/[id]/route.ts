/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Case } from '@/lib/models';

/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     tags: [Cases]
 *     summary: Get a case by ID
 *     description: Retrieve a single case's details by its MongoDB ObjectId.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the case to retrieve.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Case retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Case'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Internal server error
 *   put:
 *     tags: [Cases]
 *     summary: Update a case by ID
 *     description: Update an existing case's details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the case to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Case'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Case updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Case'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     tags: [Cases]
 *     summary: Delete a case by ID
 *     description: Delete a case from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the case to delete.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Case deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Case not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(PERMISSIONS.CASES_READ)(
      request
    );
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Case ID format' },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const pipeline = [
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedUser',
        },
      },
      { $unwind: { path: '$assignedUser', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: { $toString: '$_id' },
          caseId: 1,
          title: 1,
          description: 1,
          status: 1,
          clientName: 1,
          assignedTo: { $toString: '$assignedTo' },
          createdAt: 1,
          updatedAt: 1,
          'assignedUser.name': '$assignedUser.name',
          'assignedUser.role': '$assignedUser.role',
        },
      },
    ];

    const cases = await db
      .collection<Case>('cases')
      .aggregate(pipeline)
      .toArray();
    const caseDetails = cases[0];

    if (!caseDetails) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json(caseDetails);
  } catch (error) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.CASES_UPDATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;
    const body = await request.json();
    const { _id, caseId, ...updateData } = body; // Exclude _id and caseId from direct update

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Case ID format' },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    const updatePayload: Partial<Case> = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Ensure assignedTo is ObjectId if present and valid
    if (
      updatePayload.assignedTo &&
      typeof updatePayload.assignedTo === 'string'
    ) {
      if (ObjectId.isValid(updatePayload.assignedTo)) {
        updatePayload.assignedTo = new ObjectId(updatePayload.assignedTo);
      } else {
        // If assignedTo is an empty string or invalid, set it to undefined to clear the reference
        updatePayload.assignedTo = undefined;
      }
    } else if (updatePayload.assignedTo === null) {
      // Explicitly handle null to clear the reference
      updatePayload.assignedTo = undefined;
    }

    const result = await db
      .collection<Case>('cases')
      .findOneAndUpdate(
        { _id: objectId },
        { $set: updatePayload },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return NextResponse.json(
        { error: 'Case not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result.value,
      _id: result.value._id.toString(),
    });
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: 'Failed to update case' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.CASES_DELETE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Case ID format' },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    // Check if there are any documents associated with this case
    const associatedDocumentsCount = await db
      .collection('documents')
      .countDocuments({ caseId: objectId });
    if (associatedDocumentsCount > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete case with associated documents. Please delete all documents first.',
        },
        { status: 400 }
      );
    }

    const result = await db
      .collection<Case>('cases')
      .deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { error: 'Failed to delete case' },
      { status: 500 }
    );
  }
}
