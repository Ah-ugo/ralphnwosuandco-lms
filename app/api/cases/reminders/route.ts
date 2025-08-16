/** @format */
import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authMiddleware, requirePermission } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const authResponse = await authMiddleware(request);
    if (authResponse) return authResponse;

    const permissionResponse = await requirePermission(
      PERMISSIONS.CASES_UPDATE
    )(request);
    if (permissionResponse) return permissionResponse;

    const db = await getDatabase();
    const body = await request.json();
    const { caseId, dueDate, message, assignedTo } = body;

    if (!caseId || !dueDate || !message || !assignedTo) {
      return NextResponse.json(
        { error: 'Case ID, due date, message and assignedTo are required' },
        { status: 400 }
      );
    }

    // Get case details
    const caseObjectId = new ObjectId(caseId);
    const caseDetails = await db
      .collection('cases')
      .findOne({ _id: caseObjectId });
    if (!caseDetails) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Get assigned user details
    const userObjectId = new ObjectId(assignedTo);
    const user = await db.collection('users').findOne({ _id: userObjectId });
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Assigned user not found or has no email' },
        { status: 404 }
      );
    }

    // Create reminder
    const reminder = {
      caseId: caseObjectId,
      dueDate: new Date(dueDate),
      message,
      assignedTo: userObjectId,
      createdAt: new Date(),
      status: 'pending',
    };

    await db.collection('reminders').insertOne(reminder);

    // Send email notification
    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1f2937;">Case Reminder: ${caseDetails.title}</h2>
        <p>Dear ${user.name},</p>
        <p>This is a reminder for the following case:</p>
        <ul>
          <li><strong>Case ID:</strong> ${caseDetails.caseId}</li>
          <li><strong>Client:</strong> ${caseDetails.clientName}</li>
          <li><strong>Reminder Date:</strong> ${formattedDate}</li>
        </ul>
        <div style="padding: 15px; background-color: #f8f9fa; border-radius: 4px; margin: 15px 0;">
          <strong>Message:</strong>
          <p>${message}</p>
        </div>
        <p>You can view the case details by clicking <a href="${process.env.NEXTAUTH_URL}/cases/${caseId}">here</a>.</p>
        <p>Best regards,<br>The Ralph Nwosu & Co. Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Reminder: ${caseDetails.title} (Due ${formattedDate})`,
      html: emailContent,
    });

    return NextResponse.json({
      message: 'Reminder set successfully and email notification sent',
    });
  } catch (error) {
    console.error('Error setting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to set reminder' },
      { status: 500 }
    );
  }
}
