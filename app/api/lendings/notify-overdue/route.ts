/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import type { LendingRecord, Borrower, Book } from '@/lib/models';
import { sendEmail, emailTemplates } from '@/lib/email';

/**
 * @swagger
 * /api/lendings/notify-overdue:
 *   post:
 *     tags: [Lendings]
 *     summary: Send overdue notifications to borrowers
 *     description: Sends email notifications to borrowers with overdue books.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue notifications sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 notifiedCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
// In your /api/lendings/notify-overdue endpoint
export async function POST(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.LENDINGS_READ
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const today = new Date();

    console.log(`Looking for overdue books as of ${today}`);

    // Find all overdue lendings (borrowed status and due date passed)
    const overdueLendings = await db
      .collection<LendingRecord>('lendings')
      .aggregate([
        {
          $match: {
            status: 'borrowed',
            dueDate: { $lt: today },
          },
        },
        {
          $lookup: {
            from: 'borrowers',
            localField: 'borrowerId',
            foreignField: '_id',
            as: 'borrower',
          },
        },
        { $unwind: '$borrower' },
        {
          $lookup: {
            from: 'books',
            localField: 'bookId',
            foreignField: '_id',
            as: 'book',
          },
        },
        { $unwind: '$book' },
      ])
      .toArray();

    console.log(`Found ${overdueLendings.length} overdue lendings`);

    if (overdueLendings.length === 0) {
      console.log('No overdue books found');
      return NextResponse.json({
        message: 'No overdue books found',
        notifiedCount: 0,
      });
    }

    // Send emails to each borrower with overdue books
    let notifiedCount = 0;

    for (const lending of overdueLendings) {
      if (!lending.borrower?.email) {
        console.log(`No email for borrower ${lending.borrower?.name}`);
        continue;
      }

      try {
        const dueDate = new Date(lending.dueDate);
        const timeDiff = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));

        console.log(`Processing overdue lending for ${lending.borrower.email}`);

        const emailData = {
          borrowerName: lending.borrower.name,
          borrowerEmail: lending.borrower.email,
          bookTitle: lending.book.title,
          author: lending.book.author,
          dueDate: dueDate,
          daysOverdue: daysOverdue,
        };

        const { subject, html } = emailTemplates.overdueNotification(emailData);
        await sendEmail({
          to: lending.borrower.email,
          subject,
          html,
        });

        notifiedCount++;
        console.log(`Notification sent to ${lending.borrower.email}`);

        // Update lending record to mark notification sent
        await db
          .collection<LendingRecord>('lendings')
          .updateOne(
            { _id: lending._id },
            { $set: { status: 'overdue', updatedAt: new Date() } }
          );
      } catch (error) {
        console.error(
          `Failed to send overdue notification for lending ${lending._id}:`,
          error
        );
      }
    }

    console.log(`Total notifications sent: ${notifiedCount}`);
    return NextResponse.json({
      message: 'Overdue notifications sent successfully',
      notifiedCount,
      totalOverdue: overdueLendings.length,
    });
  } catch (error) {
    console.error('Error sending overdue notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send overdue notifications' },
      { status: 500 }
    );
  }
}
