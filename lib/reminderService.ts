/** @format */

import { getDatabase } from './mongodb';
import { sendEmail } from './email';
import { ObjectId } from 'mongodb';

export async function checkAndSendReminders() {
  try {
    const db = await getDatabase();
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find reminders due within the next hour that haven't been sent yet
    const reminders = await db
      .collection('reminders')
      .find({
        dueDate: { $lte: oneHourFromNow, $gte: now },
        status: 'pending',
      })
      .toArray();

    console.log(`Found ${reminders.length} pending reminders to process`);

    for (const reminder of reminders) {
      try {
        // Get case details
        const caseDetails = await db.collection('cases').findOne({
          _id: new ObjectId(reminder.caseId),
        });

        // Get user details
        const user = await db.collection('users').findOne({
          _id: new ObjectId(reminder.assignedTo),
        });

        if (caseDetails && user && user.email) {
          const formattedDate = new Date(reminder.dueDate).toLocaleString();

          await sendEmail({
            to: user.email,
            subject: `REMINDER: ${caseDetails.title} is due soon`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #d97706;">
                  <h2 style="color: #d97706; margin-top: 0;">⏰ Upcoming Deadline: ${
                    caseDetails.title
                  }</h2>
                  <p>Dear ${user.name || 'Team Member'},</p>
                  <p>This is a reminder for the following case deadline:</p>
                  
                  <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      <li style="margin-bottom: 8px;"><strong>📁 Case:</strong> ${
                        caseDetails.title
                      }</li>
                      <li style="margin-bottom: 8px;"><strong>👤 Client:</strong> ${
                        caseDetails.clientName
                      }</li>
                      <li style="margin-bottom: 8px;"><strong>📅 Due:</strong> ${formattedDate}</li>
                      <li style="margin-bottom: 8px;"><strong>📋 Status:</strong> ${
                        caseDetails.status
                      }</li>
                    </ul>
                  </div>
                  
                  ${
                    reminder.message
                      ? `
                    <div style="padding: 15px; background-color: #fffbeb; border-radius: 4px; margin: 15px 0; border-left: 3px solid #f59e0b;">
                      <strong>📝 Reminder Note:</strong>
                      <p style="margin: 5px 0 0 0;">${reminder.message}</p>
                    </div>
                  `
                      : ''
                  }
                  
                  <p style="margin-top: 20px;">Please take appropriate action before the deadline.</p>
                  <p>Best regards,<br><strong>The Ralph Nwosu & Co. Team</strong></p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding: 10px; font-size: 12px; color: #666;">
                  <p>This is an automated reminder. Please do not reply to this email.</p>
                </div>
              </div>
            `,
          });

          // Mark reminder as sent
          await db
            .collection('reminders')
            .updateOne(
              { _id: reminder._id },
              { $set: { status: 'sent', sentAt: new Date() } }
            );

          console.log(
            `✅ Reminder sent successfully for case: ${caseDetails.title}`
          );
        } else {
          console.warn(`⚠️ Missing data for reminder ${reminder._id}:`, {
            hasCase: !!caseDetails,
            hasUser: !!user,
            hasEmail: !!user?.email,
          });
        }
      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder._id}:`, error);

        await db.collection('reminders').updateOne(
          { _id: reminder._id },
          {
            $set: {
              status: 'failed',
              failedAt: new Date(),
              errorMessage:
                error instanceof Error ? error.message : 'Unknown error',
            },
          }
        );
      }
    }
  } catch (error) {
    console.error('❌ Error in reminder service:', error);
  }
}

let reminderInterval: NodeJS.Timeout | null = null;

export function startReminderService() {
  if (reminderInterval) {
    console.log('Reminder service is already running');
    return;
  }

  console.log('🚀 Starting reminder service...');

  // Run immediately on start
  checkAndSendReminders();

  // Then run every 30 minutes
  reminderInterval = setInterval(() => {
    console.log('🔄 Running scheduled reminder check...');
    checkAndSendReminders();
  }, 30 * 60 * 1000);

  console.log('✅ Reminder service started - checking every 30 minutes');
}

export function stopReminderService() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log('🛑 Reminder service stopped');
  }
}
