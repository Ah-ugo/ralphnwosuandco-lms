/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Document } from '@/lib/models';
import {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} from '@/lib/cloudinary'; // Import Cloudinary utilities

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get a document by ID
 *     description: Retrieve a single document's details by its MongoDB ObjectId.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the document to retrieve.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 *   put:
 *     tags: [Documents]
 *     summary: Update a document by ID
 *     description: Update an existing document's details, supporting file replacement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the document to update.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional new file to upload (replaces existing).
 *               type:
 *                 type: string
 *                 enum: [text, pdf, image, word, other]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a document by ID
 *     description: Delete a document from the database and its associated file from Cloudinary.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the document to delete.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Document deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
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

    const permissionResponse = await requirePermission(
      PERMISSIONS.DOCUMENTS_READ
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Document ID format' },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const document = await db
      .collection<Document>('documents')
      .findOne({ _id: objectId });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...document, _id: document._id.toString() });
  } catch (error) {
    console.error('Error fetching document:', error);
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
      PERMISSIONS.DOCUMENTS_UPDATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Document ID format' },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const existingDocument = await db
      .collection<Document>('documents')
      .findOne({ _id: objectId });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as string;
    const file = formData.get('file') as File | null;
    const removeFile = formData.get('removeFile') === 'true'; // Flag to explicitly remove file

    let fileUrl = existingDocument.fileUrl;
    let cloudinaryPublicId = existingDocument.cloudinaryPublicId;

    if (removeFile && cloudinaryPublicId) {
      // Delete existing file from Cloudinary if requested
      try {
        await deleteFileFromCloudinary(cloudinaryPublicId);
        fileUrl = '';
        cloudinaryPublicId = '';
      } catch (deleteError) {
        console.error(
          'Failed to delete old file from Cloudinary:',
          deleteError
        );
        // Continue without failing the whole request, but log the error
      }
    } else if (file) {
      // New file uploaded, delete old one if exists and upload new
      if (cloudinaryPublicId) {
        try {
          await deleteFileFromCloudinary(cloudinaryPublicId);
        } catch (deleteError) {
          console.error(
            'Failed to delete old file from Cloudinary:',
            deleteError
          );
        }
      }
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uploadResult: any = await uploadFileToCloudinary(
          buffer,
          'documents'
        );
        fileUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('File upload to Cloudinary failed:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload new file to Cloudinary' },
          { status: 500 }
        );
      }
    }

    const updatePayload: Partial<Document> = {
      title: title || existingDocument.title,
      content: content || existingDocument.content,
      type: type || existingDocument.type,
      fileUrl,
      cloudinaryPublicId,
      updatedAt: new Date(),
    };

    const result = await db
      .collection<Document>('documents')
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
      caseId: result.value.caseId.toString(),
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
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
      PERMISSIONS.DOCUMENTS_DELETE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid Document ID format' },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);
    const documentToDelete = await db
      .collection<Document>('documents')
      .findOne({ _id: objectId });

    if (!documentToDelete) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete file from Cloudinary if it exists
    if (documentToDelete.cloudinaryPublicId) {
      try {
        await deleteFileFromCloudinary(documentToDelete.cloudinaryPublicId);
      } catch (deleteError) {
        console.error('Failed to delete file from Cloudinary:', deleteError);
        // Log the error but proceed with database deletion
      }
    }

    const result = await db
      .collection<Document>('documents')
      .deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
