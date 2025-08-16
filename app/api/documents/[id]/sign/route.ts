/** @format */
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.DOCUMENTS_UPDATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Document ID format' },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const { signature, signedBy, signedAt } = body;

    if (!signature || !signedBy || !signedAt) {
      return NextResponse.json(
        { error: 'Signature, signedBy and signedAt are required' },
        { status: 400 }
      );
    }

    const updatePayload = {
      signature,
      signedBy,
      signedAt: new Date(signedAt),
      updatedAt: new Date(),
    };

    const result = await db
      .collection('documents')
      .findOneAndUpdate(
        { _id: objectId },
        { $set: updatePayload },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return NextResponse.json(
        { error: 'Document not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result.value,
      _id: result.value._id.toString(),
    });
  } catch (error) {
    console.error('Error adding signature to document:', error);
    return NextResponse.json(
      { error: 'Failed to add signature to document' },
      { status: 500 }
    );
  }
}
