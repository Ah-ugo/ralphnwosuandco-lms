/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import type { Borrower } from '@/lib/models';
import { validateBorrowerUpdate } from '@/lib/validators';

interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    permissions: string[];
  };
}

/**
 * @swagger
 * /api/borrowers/{id}:
 *   get:
 *     tags: [Borrowers]
 *     summary: Get a borrower by ID
 *     description: Retrieve a single borrower's details by their ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the borrower to retrieve
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Borrower details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Borrower'
 *       400:
 *         description: Invalid ID format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Borrower not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication and permission checks
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.BORROWERS_READ
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    // Try both ObjectId and string ID formats
    const query = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };

    const borrower = await db.collection<Borrower>('borrowers').findOne(query);

    if (!borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...borrower,
      _id: borrower._id.toString(),
    });
  } catch (error) {
    console.error('Error fetching borrower:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrower' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/borrowers/{id}:
 *   put:
 *     tags: [Borrowers]
 *     summary: Update a borrower (full or partial)
 *     description: Update borrower information. Supports partial updates.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the borrower to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BorrowerUpdate'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Borrower updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Borrower'
 *       400:
 *         description: Invalid input or member ID conflict
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Borrower not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication and permission checks
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.BORROWERS_UPDATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;
    const updateData = await request.json();

    // Create query that works with both string and ObjectId formats
    const query = {
      $or: [{ _id: new ObjectId(id) }, { _id: id }],
    };

    // Check if borrower exists
    const existingBorrower = await db
      .collection<Borrower>('borrowers')
      .findOne(query);

    if (!existingBorrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    // Check for memberId conflict if being updated
    if (
      updateData.memberId &&
      updateData.memberId !== existingBorrower.memberId
    ) {
      const memberIdExists = await db
        .collection<Borrower>('borrowers')
        .findOne({
          memberId: updateData.memberId,
          _id: { $ne: existingBorrower._id },
        });

      if (memberIdExists) {
        return NextResponse.json(
          { error: 'Member ID already in use by another borrower' },
          { status: 400 }
        );
      }
    }

    // Prepare update payload
    const updatePayload = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Perform update - the critical fix is here
    const result = await db.collection<Borrower>('borrowers').findOneAndUpdate(
      { _id: existingBorrower._id },
      { $set: updatePayload },
      {
        returnDocument: 'after',
        // These additional options ensure proper success detection
        includeResultMetadata: true,
      }
    );

    // The proper way to check for successful update
    if (!result.lastErrorObject?.updatedExisting) {
      return NextResponse.json(
        { error: 'No changes made to borrower' },
        { status: 400 }
      );
    }

    // Audit log
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      await db.collection('audit_logs').insertOne({
        action: 'UPDATE_BORROWER',
        targetId: result.value._id,
        targetType: 'borrower',
        actor: authenticatedRequest.user?.id,
        details: {
          oldValues: existingBorrower,
          newValues: result.value,
        },
        timestamp: new Date(),
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      ...result.value,
      _id: result.value._id.toString(),
    });
  } catch (error) {
    console.error('Error updating borrower:', error);
    return NextResponse.json(
      { error: 'Failed to update borrower' },
      { status: 500 }
    );
  }
}
/**
 * @swagger
 * /api/borrowers/{id}:
 *   delete:
 *     tags: [Borrowers]
 *     summary: Delete a borrower
 *     description: Delete a borrower from the system by their ID after checking for active loans.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the borrower to delete
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Borrower deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedBorrower:
 *                   $ref: '#/components/schemas/Borrower'
 *       400:
 *         description: Invalid ID format or borrower has active loans
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Borrower not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication and permission checks
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.BORROWERS_DELETE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    // Try both ObjectId and string ID formats
    const query = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };

    // Check if borrower exists
    const borrower = await db.collection<Borrower>('borrowers').findOne(query);

    if (!borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    // Check for active loans
    const activeLoans = await db.collection('loans').countDocuments({
      borrowerId: { $in: [borrower._id, borrower._id.toString()] },
      status: { $in: ['active', 'overdue'] },
      returnedAt: { $exists: false },
    });

    if (activeLoans > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete borrower with active loans',
          activeLoansCount: activeLoans,
        },
        { status: 400 }
      );
    }

    // Perform deletion using the original ID format
    const deleteQuery =
      borrower._id instanceof ObjectId
        ? { _id: borrower._id }
        : { _id: borrower._id };

    const result = await db
      .collection<Borrower>('borrowers')
      .deleteOne(deleteQuery);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Borrower not found or already deleted' },
        { status: 404 }
      );
    }

    // Audit log
    try {
      const authenticatedRequest = request as AuthenticatedRequest;
      await db.collection('audit_logs').insertOne({
        action: 'DELETE_BORROWER',
        targetId: borrower._id,
        targetType: 'borrower',
        actor: authenticatedRequest.user?.id,
        details: {
          deletedBorrower: borrower,
        },
        timestamp: new Date(),
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json(
      {
        message: 'Borrower deleted successfully',
        deletedBorrower: {
          ...borrower,
          _id: borrower._id.toString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting borrower:', error);
    return NextResponse.json(
      { error: 'Failed to delete borrower' },
      { status: 500 }
    );
  }
}

// Alias PATCH to PUT since we support partial updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, params);
}

// POST is not allowed on individual resource endpoints
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
