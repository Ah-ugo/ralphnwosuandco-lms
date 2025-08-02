/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// import { type NextRequest, NextResponse } from 'next/server';
// import { getDatabase } from '@/lib/mongodb';
// import { ObjectId } from 'mongodb';
// import { authMiddleware, requirePermission } from '@/lib/middleware';
// import { PERMISSIONS } from '@/lib/auth';
// import type { Book } from '@/lib/models';

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Book } from '@/lib/models';

/**
 * @swagger
 * /books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Get a book by ID
 *     description: Retrieve a single book's details by its MongoDB ObjectId.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the book to retrieve.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Book retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 *   put:
 *     tags: [Books]
 *     summary: Update a book by ID
 *     description: Update an existing book's details.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the book to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Book updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     tags: [Books]
 *     summary: Delete a book by ID
 *     description: Delete a book from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: The ID of the book to delete.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Book deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Book not found
 *       500:
 *         description: Internal server error
 */
const validateBookData = (data: Partial<Book>) => {
  const errors: string[] = [];

  if (data.title && data.title.length < 2) {
    errors.push('Title must be at least 2 characters');
  }

  if (data.author && data.author.length < 2) {
    errors.push('Author name must be at least 2 characters');
  }

  if (data.availableCopies !== undefined && data.availableCopies < 0) {
    errors.push('Available copies cannot be negative');
  }

  if (data.totalCopies !== undefined && data.totalCopies < 0) {
    errors.push('Total copies cannot be negative');
  }

  if (
    data.availableCopies !== undefined &&
    data.totalCopies !== undefined &&
    data.availableCopies > data.totalCopies
  ) {
    errors.push('Available copies cannot exceed total copies');
  }

  return errors;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(PERMISSIONS.BOOKS_READ)(
      request
    );
    if (permissionResponse) return permissionResponse;

    const { id } = params;
    console.log(`Fetching book with ID: ${id}`);

    if (!ObjectId.isValid(id)) {
      console.error(`Invalid Book ID format: ${id}`);
      return NextResponse.json(
        { error: 'Invalid Book ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const objectId = new ObjectId(id);

    const book = await db.collection<Book>('books').findOne({ _id: objectId });

    if (!book) {
      console.error(`Book not found with ID: ${id}`);
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const responseData = {
      ...book,
      _id: book._id.toString(),
    };

    console.log(`Successfully fetched book: ${id}`);
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching book:', error);
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
      PERMISSIONS.BOOKS_UPDATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const { id } = params;
    console.log(`Updating book with ID: ${id}`);

    if (!ObjectId.isValid(id)) {
      console.error(`Invalid Book ID format: ${id}`);
      return NextResponse.json(
        { error: 'Invalid Book ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const objectId = new ObjectId(id);

    const body = await request.json();
    const { _id, ...updateData } = body;

    if (
      updateData.availableCopies !== undefined &&
      updateData.availableCopies < 0
    ) {
      return NextResponse.json(
        { error: 'Available copies cannot be negative' },
        { status: 400 }
      );
    }

    const updatePayload = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await db.collection<Book>('books').findOneAndUpdate(
      { _id: objectId },
      { $set: updatePayload },
      {
        returnDocument: 'after',
        includeResultMetadata: true,
      }
    );

    if (!result.value) {
      console.error(
        'Update operation failed. Full result:',
        JSON.stringify(result, null, 2)
      );
      return NextResponse.json(
        { error: 'Book not found or no changes made' },
        { status: 404 }
      );
    }

    const previousValues = await db
      .collection<Book>('books')
      .findOne({ _id: objectId });
    if (JSON.stringify(previousValues) === JSON.stringify(result.value)) {
      console.log('No actual changes were made to the document');
      return NextResponse.json(
        {
          message:
            'No changes were made - document already contains these values',
          book: {
            ...result.value,
            _id: result.value._id.toString(),
          },
        },
        { status: 200 }
      );
    }

    console.log('Successfully updated book:', result.value._id);
    return NextResponse.json({
      ...result.value,
      _id: result.value._id.toString(),
    });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
      PERMISSIONS.BOOKS_DELETE
    )(request);
    if (permissionResponse) return permissionResponse;

    const { id } = params;
    console.log(`Deleting book with ID: ${id}`);

    if (!ObjectId.isValid(id)) {
      console.error(`Invalid Book ID format: ${id}`);
      return NextResponse.json(
        { error: 'Invalid Book ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const objectId = new ObjectId(id);

    const existingBook = await db
      .collection<Book>('books')
      .findOne({ _id: objectId });
    if (!existingBook) {
      console.error(`Book not found with ID: ${id}`);
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const activeLendings = await db.collection('lendings').countDocuments({
      bookId: objectId,
      status: 'borrowed',
    });

    if (activeLendings > 0) {
      console.error(
        `Cannot delete book ${id} - has ${activeLendings} active lendings`
      );
      return NextResponse.json(
        {
          error: 'Cannot delete book with active lending records',
          activeLendings,
        },
        { status: 400 }
      );
    }

    const result = await db
      .collection<Book>('books')
      .deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      console.error('Delete operation failed for book ID:', id);
      return NextResponse.json(
        { error: 'Failed to delete book' },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted book: ${id}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
