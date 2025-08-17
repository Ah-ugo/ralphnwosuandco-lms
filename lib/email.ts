/** @format */

import nodemailer from 'nodemailer';

export interface WelcomeEmailData {
  userName: string;
  userRole: string;
}

export interface OverdueBookNotification {
  borrowerName: string;
  borrowerEmail: string;
  bookTitle: string;
  author: string;
  dueDate: Date;
  daysOverdue: number;
}

export interface DueSoonNotification {
  borrowerName: string;
  borrowerEmail: string;
  bookTitle: string;
  author: string;
  dueDate: Date;
  daysUntilDue: number;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const createTransporter = () => {
  const requiredEnvVars = [
    'SMTP_SERVER',
    'EMAIL_SERVER_PORT',
    'EMAIL_FROM',
    'SMTP_PASSWORD',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required email environment variables: ${missingVars.join(', ')}`
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: Number.parseInt(process.env.EMAIL_SERVER_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true', // Use the EMAIL_SECURE variable
    auth: {
      user: process.env.EMAIL_FROM, // Use EMAIL_FROM as the username
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  });
};

/**
 * Sends an email using the configured Nodemailer transporter.
 * @param options Email options including recipient, subject, HTML, and text content.
 * @returns Promise<boolean> indicating success or failure.
 */
export async function sendEmail({ to, subject, html }: EmailOptions) {
  console.log('Attempting to send email to:', to);

  try {
    const transporter = createTransporter();

    console.log('Using SMTP config:', {
      host: process.env.SMTP_SERVER,
      port: process.env.EMAIL_SERVER_PORT,
      user: process.env.EMAIL_FROM?.substring(0, 3) + '...',
    });

    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified');

    console.log('Sending email...');
    const info = await transporter.sendMail({
      from: `"Ralph Nwosu & Co." <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log('Message sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export async function testEmailConnection() {
  try {
    console.log('Testing email server connection...');
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server connection verified');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error);
    throw new Error(
      `Email connection failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export function generateOverdueEmailHtml(
  borrowerName: string,
  bookTitle: string,
  dueDate: Date
): string {
  const formattedDueDate = dueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #d9534f;">Overdue Book Reminder</h2>
      <p>Dear ${borrowerName},</p>
      <p>This is a friendly reminder that the book <strong>"${bookTitle}"</strong> that you borrowed is now overdue.</p>
      <p>It was due on: <strong>${formattedDueDate}</strong></p>
      <p>Please return the book as soon as possible to avoid further charges or restrictions.</p>
      <p>If you have already returned the book, please disregard this email.</p>
      <p>Thank you for your cooperation.</p>
      <p>Sincerely,<br>
      The Ralph Nwosu & Co. Library Team</p>
    </div>
  `;
}

export async function sendInvitationEmail(email: string, token: string) {
  const invitationLink = `${process.env.NEXTAUTH_URL}/auth/accept-invitation?token=${token}`;

  const emailOptions = {
    to: email,
    subject: `You've been invited to ${process.env.APP_NAME || 'our system'}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>You've been invited!</h2>
        <p>You've been invited to join ${
          process.env.APP_NAME || 'our system'
        }.</p>
        <p>Please click the link below to complete your registration:</p>
        <p><a href="${invitationLink}" style="background-color: #2563eb; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Registration</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  return sendEmail(emailOptions);
}

export const documentSignatureNotification = (
  recipientName: string,
  documentTitle: string,
  caseTitle: string,
  signedBy: string,
  signedAt: Date,
  documentUrl: string
) => ({
  subject: `Document Signed: ${documentTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #1f2937;">Document Signed: ${documentTitle}</h2>
      <p>Dear ${recipientName},</p>
      <p>The following document has been signed:</p>
      <ul>
        <li><strong>Document:</strong> ${documentTitle}</li>
        <li><strong>Case:</strong> ${caseTitle}</li>
        <li><strong>Signed by:</strong> ${signedBy}</li>
        <li><strong>Signed at:</strong> ${signedAt.toLocaleString()}</li>
      </ul>
      <p>You can view the signed document <a href="${documentUrl}">here</a>.</p>
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 4px;">
        <p style="font-weight: bold;">Signature Preview:</p>
        <img src="${documentUrl}" alt="Document Signature" style="max-width: 200px; border: 1px solid #ddd; margin-top: 10px;"/>
      </div>
      <p>Best regards,<br>The Ralph Nwosu & Co. Team</p>
    </div>
  `,
});

export const emailTemplates = {
  welcomeEmail: (userName: string, userRole: string) => ({
    subject: `Welcome to Ralph Nwosu & Co. Library System, ${userName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1f2937;">Welcome to Ralph Nwosu & Co. Library System!</h2>
          <p>Dear ${userName},</p>
          <p>Your account with the role <strong>${userRole}</strong> has been successfully created.</p>
          <p>You can now log in and start managing your library resources.</p>
          <p>Access your dashboard here: <a href="${process.env.NEXTAUTH_URL}" style="color: #2563eb; text-decoration: none;">${process.env.NEXTAUTH_URL}</a></p>
          <p>If you have any questions, feel free to contact us.</p>
          <p>Best regards,<br>The Ralph Nwosu & Co. Team</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 0.9em; color: #777;">This is an automated email, please do not reply.</p>
        </div>
      </div>
    `,
  }),

  overdueNotification: (data: OverdueBookNotification) => ({
    subject: `Urgent: Overdue Book Reminder - ${data.bookTitle}`,
    html: generateOverdueEmailHtml(
      data.borrowerName,
      data.bookTitle,
      data.dueDate
    ),
  }),

  dueSoonNotification: (data: DueSoonNotification) => ({
    subject: `Reminder: Book Due Soon - ${data.bookTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fcd34d; border-radius: 8px; background-color: #fffbeb;">
          <h2 style="color: #d97706;">Book Due Soon!</h2>
          <p>Dear ${data.borrowerName},</p>
          <p>This is a friendly reminder that the following book is due soon:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Book Title:</strong> ${data.bookTitle}</li>
            <li><strong>Author:</strong> ${data.author}</li>
            <li><strong>Due Date:</strong> ${new Date(
              data.dueDate
            ).toLocaleDateString()}</li>
            <li><strong>Days Until Due:</strong> ${data.daysUntilDue}</li>
          </ul>
          <p>Please return the book on or before the due date to avoid any overdue penalties.</p>
          <p>Thank you for your cooperation.</p>
          <p>Best regards,<br>The Ralph Nwosu & Co. Library Team</p>
          <hr style="border: none; border-top: 1px solid #fcd34d; margin: 20px 0;">
          <p style="font-size: 0.9em; color: #b45309;">This is an automated email, please do not reply.</p>
        </div>
      </div>
    `,
  }),
};
