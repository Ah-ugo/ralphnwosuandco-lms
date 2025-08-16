/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { Case } from '@/lib/models';
import { ObjectId } from 'mongodb';

/**
 * @swagger
 * /api/cases:
 *   get:
 *     tags: [Cases]
 *     summary: Get all cases
 *     description: Retrieve a list of all cases with pagination and search capabilities.
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
 *         description: Search query for case ID, title, or client name.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, Closed, Pending, Archived]
 *         description: Filter cases by status.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cases:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Case'
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *   post:
 *     tags: [Cases]
 *     summary: Create a new case
 *     description: Add a new case to the system.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *               - title
 *               - clientName
 *               - status
 *             properties:
 *               caseId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Open, Closed, Pending, Archived]
 *               clientName:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *                 format: objectId
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Case created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Case'
 *       400:
 *         description: Invalid input or case ID already exists
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

    const permissionError = await requirePermission(PERMISSIONS.CASES_READ)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '10');
    const searchQuery = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status');

    const query: any = {};
    if (searchQuery) {
      query.$or = [
        { caseId: { $regex: searchQuery, $options: 'i' } },
        { title: { $regex: searchQuery, $options: 'i' } },
        { clientName: { $regex: searchQuery, $options: 'i' } },
      ];
    }
    if (
      statusFilter &&
      ['Open', 'Closed', 'Pending', 'Archived'].includes(statusFilter)
    ) {
      query.status = statusFilter;
    }

    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'users', // Collection name for users
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
    const total = await db.collection<Case>('cases').countDocuments(query);

    return NextResponse.json({ cases, total });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const permissionError = await requirePermission(PERMISSIONS.CASES_CREATE)(
      request
    );
    if (permissionError) return permissionError;

    const db = await getDatabase();
    const body = await request.json();
    const { caseId, title, description, status, clientName, assignedTo } = body;

    if (!caseId || !title || !clientName || !status) {
      return NextResponse.json(
        { error: 'Case ID, Title, Client Name, and Status are required' },
        { status: 400 }
      );
    }

    const existingCase = await db.collection<Case>('cases').findOne({ caseId });
    if (existingCase) {
      return NextResponse.json(
        { error: 'Case with this Case ID already exists' },
        { status: 400 }
      );
    }

    const newCase: Case = {
      caseId,
      title,
      description: description || '',
      status,
      clientName,
      assignedTo: assignedTo ? new ObjectId(assignedTo) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection<Case>('cases').insertOne(newCase);

    return NextResponse.json(
      { ...newCase, _id: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: 'Failed to create case' },
      { status: 500 }
    );
  }
}
