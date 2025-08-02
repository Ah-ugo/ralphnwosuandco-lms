/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { DashboardStats } from '@/lib/models';

// export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) {
      console.log('Auth failed:', authResponse);
      return authResponse;
    }

    const permissionResponse = await requirePermission(
      PERMISSIONS.DASHBOARD_READ
    )(request);
    if (permissionResponse) {
      console.log('Permission check failed:', permissionResponse);
      return permissionResponse;
    }

    const db = await getDatabase();

    const [
      totalBooks,
      availableBooks,
      totalBorrowers,
      activeLendings,
      overdueBooks,
      mostBorrowedBooks,
    ] = await Promise.all([
      db.collection('books').countDocuments(),
      db.collection('books').countDocuments({ availableCopies: { $gt: 0 } }),
      db.collection('borrowers').countDocuments(),
      db.collection('lendings').countDocuments({ status: 'borrowed' }),
      db.collection('lendings').countDocuments({
        status: 'borrowed',
        dueDate: { $lt: new Date() },
      }),
      db
        .collection('lendings')
        .aggregate([
          { $match: { status: 'returned' } },
          { $group: { _id: '$bookId', borrowCount: { $sum: 1 } } },
          { $sort: { borrowCount: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'books',
              localField: '_id',
              foreignField: '_id',
              as: 'bookDetails',
            },
          },
          { $unwind: '$bookDetails' },
          {
            $project: {
              _id: { $toString: '$bookDetails._id' },
              title: '$bookDetails.title',
              author: '$bookDetails.author',
              borrowCount: 1,
            },
          },
        ])
        .toArray(),
    ]);

    const stats: DashboardStats = {
      totalBooks,
      availableBooks,
      totalBorrowers,
      activeLendings,
      overdueBooks,
      mostBorrowedBooks,
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch dashboard statistics',
      },
      { status: 500 }
    );
  }
}
