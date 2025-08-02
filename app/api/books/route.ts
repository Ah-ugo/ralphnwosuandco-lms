/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Book } from '@/lib/models';

/**
 * @swagger
 * /books:
 *   get:
 *     tags: [Books]
 *     summary: Get all books
 *     description: Retrieve a list of all books with pagination and search capabilities.
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for title, author, ISBN, or book ID.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of books retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 books:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Book'
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *   post:
 *     tags: [Books]
 *     summary: Create a new book
 *     description: Add a new book to the library.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - author
 *               - category
 *               - totalCopies
 *               - shelfLocation
 *               - bookId
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [Textbook, Statute, Law Report, Case Law, Journal, Reference]
 *               isbn:
 *                 type: string
 *               bookId:
 *                 type: string
 *               totalCopies:
 *                 type: integer
 *               shelfLocation:
 *                 type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               coverImage:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Book created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid input or book ID already exists
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

    const permissionError = await requirePermission(PERMISSIONS.BOOKS_READ)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '10');
    const searchQuery = searchParams.get('search') || '';

    const query: any = {};
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { author: { $regex: searchQuery, $options: 'i' } },
        { isbn: { $regex: searchQuery, $options: 'i' } },
        { bookId: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const books = await db
      .collection<Book>('books')
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await db.collection<Book>('books').countDocuments(query);

    return NextResponse.json({
      books: books.map((b) => ({ ...b, _id: b._id?.toString() })),
      total,
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(PERMISSIONS.BOOKS_CREATE)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const body = await request.json();
    const {
      title,
      author,
      category,
      isbn,
      bookId,
      totalCopies,
      shelfLocation,
      keywords,
      coverImage,
    } = body;

    if (
      !title ||
      !author ||
      !category ||
      !bookId ||
      !totalCopies ||
      !shelfLocation
    ) {
      return NextResponse.json(
        {
          error:
            'Title, Author, Category, Book ID, Total Copies, and Shelf Location are required',
        },
        { status: 400 }
      );
    }

    const existingBook = await db.collection<Book>('books').findOne({ bookId });
    if (existingBook) {
      return NextResponse.json(
        { error: 'Book with this Book ID already exists' },
        { status: 400 }
      );
    }

    const newBook: Book = {
      title,
      author,
      category,
      isbn: isbn || '',
      bookId,
      totalCopies: Number.parseInt(totalCopies),
      availableCopies: Number.parseInt(totalCopies),
      shelfLocation,
      keywords: keywords || [],
      coverImage: coverImage || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Book>('books').insertOne(newBook);

    return NextResponse.json(
      { ...newBook, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}
