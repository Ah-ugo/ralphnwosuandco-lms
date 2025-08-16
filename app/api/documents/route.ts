/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PERMISSIONS } from '@/lib/auth';
import type { Document } from '@/lib/models';
import { ObjectId } from 'mongodb';
import { uploadFileToCloudinary } from '@/lib/cloudinary';

/**
 * @swagger
 * /api/documents:
 *   post:
 *     tags: [Documents]
 *     summary: Create a new document
 *     description: Add a new document associated with a case, supporting file uploads.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *               - title
 *               - content
 *               - type
 *             properties:
 *               caseId:
 *                 type: string
 *                 format: objectId
 *                 description: The ID of the case this document belongs to.
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *                 description: The content of the document (text, HTML, Markdown).
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional file to upload.
 *               type:
 *                 type: string
 *                 enum: [text, pdf, image, word, other]
 *                 description: The type of document.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Invalid input or case not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Document upload request received');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!session.user.permissions?.includes(PERMISSIONS.DOCUMENTS_CREATE)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    console.log('✅ Connected to MongoDB database:', db.databaseName);

    const formData = await request.formData();
    console.log('Form data received with keys:', Array.from(formData.keys()));

    // Extract form fields
    const caseId = formData.get('caseId') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as string;
    const file = formData.get('file') as File | null;

    console.log('Extracted form fields:', {
      caseId,
      title,
      type,
      fileSize: file?.size,
    });

    // Validate required fields
    if (!caseId || !title || !content || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, title, content, type' },
        { status: 400 }
      );
    }

    // Validate caseId format
    if (!ObjectId.isValid(caseId)) {
      return NextResponse.json(
        { error: 'Invalid case ID format' },
        { status: 400 }
      );
    }

    // Check if case exists
    const caseExists = await db
      .collection('cases')
      .findOne({ _id: new ObjectId(caseId) });
    if (!caseExists) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    let fileUrl = '';
    let cloudinaryPublicId = '';

    if (file && file.size > 0) {
      console.log('Processing file upload:', file.name, 'Size:', file.size);

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: 'Unsupported file type. Allowed: PDF, Word, Text, JPG, PNG',
          },
          { status: 400 }
        );
      }

      try {
        // Convert file to buffer for Cloudinary upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        console.log('Uploading file to Cloudinary...');
        const uploadResult = await uploadFileToCloudinary(
          buffer,
          'documents',
          file.name
        );

        fileUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
        console.log('✅ File uploaded to Cloudinary:', fileUrl);
      } catch (uploadError) {
        console.error('❌ Cloudinary upload failed:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload file to cloud storage' },
          { status: 500 }
        );
      }
    } else {
      console.log('No file provided or file size is 0');
    }

    // Create new document
    const newDocument: Document = {
      caseId: new ObjectId(caseId),
      title,
      content,
      fileUrl,
      cloudinaryPublicId,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Creating document in database:', newDocument);

    // Insert into database
    const result = await db
      .collection<Document>('documents')
      .insertOne(newDocument);
    console.log('Document created with ID:', result.insertedId);

    return NextResponse.json(
      {
        ...newDocument,
        _id: result.insertedId.toString(),
        message: 'Document created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Document creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
