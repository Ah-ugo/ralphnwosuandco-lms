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
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number.parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: process.env.EMAIL_SERVER_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

/**
 * Sends an email using the configured Nodemailer transporter.
 * @param options Email options including recipient, subject, HTML, and text content.
 * @returns Promise<boolean> indicating success or failure.
 */
export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.EMAIL_FROM) {
    console.warn(
      'EMAIL_FROM environment variable is not set. Email sending skipped.'
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to} with subject: ${subject}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : String(error)
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
