/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { LendingRecord, Book, Borrower } from '@/lib/models';

/**
 * @swagger
 * /api/lendings:
 *   get:
 *     tags: [Lendings]
 *     summary: Get all lending records
 *     description: Retrieve a list of all lending records with pagination and optional status filter.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [borrowed, returned, overdue]
 *         description: Filter lendings by status.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of lending records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lendings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LendingRecord'
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *   post:
 *     tags: [Lendings]
 *     summary: Create a new lending record
 *     description: Record a new book borrowing event.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *               - borrowerId
 *               - dueDate
 *             properties:
 *               bookId:
 *                 type: string
 *                 description: The ID of the book being borrowed.
 *               borrowerId:
 *                 type: string
 *                 description: The ID of the borrower.
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 description: The date the book is due to be returned.
 *               notes:
 *                 type: string
 *                 description: Optional notes for the lending record.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Lending record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LendingRecord'
 *       400:
 *         description: Invalid input or book not available
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Book or borrower not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(PERMISSIONS.LENDINGS_READ)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '10');
    const statusFilter = searchParams.get('status');

    const query: any = {};
    if (
      statusFilter &&
      ['borrowed', 'returned', 'overdue'].includes(statusFilter)
    ) {
      if (statusFilter === 'overdue') {
        query.status = 'borrowed';
        query.dueDate = { $lt: new Date() };
      } else {
        query.status = statusFilter;
      }
    }

    const pipeline = [
      { $match: query },
      { $sort: { borrowDate: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'borrowers',
          localField: 'borrowerId',
          foreignField: '_id',
          as: 'borrower',
        },
      },
      { $unwind: { path: '$borrower', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: { $toString: '$_id' },
          bookId: { $toString: '$bookId' },
          borrowerId: { $toString: '$borrowerId' },
          borrowDate: 1,
          dueDate: 1,
          returnDate: 1,
          status: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
          'book._id': { $toString: '$book._id' },
          'book.title': '$book.title',
          'book.author': '$book.author',
          'borrower._id': { $toString: '$borrower._id' },
          'borrower.name': '$borrower.name',
          'borrower.role': '$borrower.role',
        },
      },
    ];

    const lendings = await db
      .collection<LendingRecord>('lendings')
      .aggregate(pipeline)
      .toArray();
    const total = await db
      .collection<LendingRecord>('lendings')
      .countDocuments(query);

    return NextResponse.json({ lendings, total });
  } catch (error) {
    console.error('Error fetching lendings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lendings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(
      PERMISSIONS.LENDINGS_CREATE
    )(request);
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const body = await request.json();
    const { bookId, borrowerId, dueDate, notes } = body;

    if (!bookId || !borrowerId || !dueDate) {
      return NextResponse.json(
        { error: 'Book ID, Borrower ID, and Due Date are required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(bookId) || !ObjectId.isValid(borrowerId)) {
      return NextResponse.json(
        { error: 'Invalid Book ID or Borrower ID' },
        { status: 400 }
      );
    }

    const bookObjectId = new ObjectId(bookId);
    const borrowerObjectId = new ObjectId(borrowerId);

    const book = await db
      .collection<Book>('books')
      .findOne({ _id: bookObjectId });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    if (book.availableCopies <= 0) {
      return NextResponse.json(
        { error: 'No available copies of this book' },
        { status: 400 }
      );
    }

    const borrower = await db
      .collection<Borrower>('borrowers')
      .findOne({ _id: borrowerObjectId });
    if (!borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    const newLending: LendingRecord = {
      bookId: bookObjectId,
      borrowerId: borrowerObjectId,
      borrowDate: new Date(),
      dueDate: new Date(dueDate),
      status: 'borrowed',
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection<LendingRecord>('lendings')
      .insertOne(newLending);

    await db
      .collection<Book>('books')
      .updateOne({ _id: bookObjectId }, { $inc: { availableCopies: -1 } });

    return NextResponse.json(
      { ...newLending, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating lending record:', error);
    return NextResponse.json(
      { error: 'Failed to create lending record' },
      { status: 500 }
    );
  }
}
