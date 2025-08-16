/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { type NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PERMISSIONS } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Document email request received');

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!session.user.permissions?.includes(PERMISSIONS.DOCUMENTS_READ)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentId, recipientEmail, message } = body;

    console.log('[v0] Email request data:', {
      documentId,
      recipientEmail,
      hasMessage: !!message,
    });

    // Validate required fields
    if (!documentId || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, recipientEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate documentId format
    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    console.log('[v0] Connected to database');

    // Get document details
    const document = await db
      .collection('documents')
      .findOne({ _id: new ObjectId(documentId) });
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get case details for context
    const caseDetails = await db
      .collection('cases')
      .findOne({ _id: document.caseId });
    if (!caseDetails) {
      return NextResponse.json(
        { error: 'Associated case not found' },
        { status: 404 }
      );
    }

    console.log('[v0] Found document and case:', {
      documentTitle: document.title,
      caseTitle: caseDetails.title,
    });

    // Prepare email content
    const subject = `Document Shared: ${document.title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <h2 style="color: #1f2937; margin-top: 0;">📄 Document Shared: ${
            document.title
          }</h2>
          <p>Hello,</p>
          <p>A document has been shared with you from Ralph Nwosu & Co.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px;"><strong>📁 Document:</strong> ${
                document.title
              }</li>
              <li style="margin-bottom: 8px;"><strong>📋 Case:</strong> ${
                caseDetails.title
              }</li>
              <li style="margin-bottom: 8px;"><strong>👤 Client:</strong> ${
                caseDetails.clientName
              }</li>
              <li style="margin-bottom: 8px;"><strong>📅 Shared:</strong> ${new Date().toLocaleDateString()}</li>
              <li style="margin-bottom: 8px;"><strong>📝 Type:</strong> ${document.type.toUpperCase()}</li>
            </ul>
          </div>
          
          ${
            message
              ? `
            <div style="padding: 15px; background-color: #fffbeb; border-radius: 4px; margin: 15px 0; border-left: 3px solid #f59e0b;">
              <strong>💬 Message:</strong>
              <p style="margin: 5px 0 0 0;">${message}</p>
            </div>
          `
              : ''
          }
          
          ${
            document.fileUrl
              ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${document.fileUrl}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                📥 Download Document
              </a>
            </div>
          `
              : ''
          }
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e5f3ff; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px;"><strong>Document Content Preview:</strong></p>
            <div style="margin-top: 10px; padding: 10px; background-color: white; border-radius: 4px; max-height: 200px; overflow-y: auto;">
              ${document.content.substring(0, 500)}${
      document.content.length > 500 ? '...' : ''
    }
            </div>
          </div>
          
          <p style="margin-top: 20px;">Best regards,<br><strong>The Ralph Nwosu & Co. Team</strong></p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 12px; color: #666;">
          <p>This document was sent from Ralph Nwosu & Co. Legal Management System.</p>
        </div>
      </div>
    `;

    // Send email
    console.log('[v0] Sending email to:', recipientEmail);
    await sendEmail({
      to: recipientEmail,
      subject,
      html,
    });

    console.log('[v0] Email sent successfully');

    // Log the email activity (optional)
    await db.collection('email_logs').insertOne({
      documentId: new ObjectId(documentId),
      caseId: document.caseId,
      recipientEmail,
      subject,
      sentBy: session.user.id,
      sentAt: new Date(),
      message: message || null,
    });

    return NextResponse.json({
      message: 'Document sent successfully',
      recipientEmail,
      documentTitle: document.title,
    });
  } catch (error) {
    console.error('[v0] Document email error:', error);
    return NextResponse.json(
      { error: 'Failed to send document email' },
      { status: 500 }
    );
  }
}
