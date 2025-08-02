/** @format */

import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Notification, User } from '@/lib/models';
import { sendEmail } from '@/lib/email';

export async function createNotification(
  userId: string | ObjectId,
  message: string,
  type: Notification['type'],
  lendingId?: string | ObjectId,
  bookId?: string | ObjectId
) {
  try {
    const db = await getDatabase();
    const notificationsCollection =
      db.collection<Notification>('notifications');

    const newNotification: Notification = {
      userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
      message,
      type,
      read: false,
      createdAt: new Date(),
      ...(lendingId && {
        lendingId:
          typeof lendingId === 'string' ? new ObjectId(lendingId) : lendingId,
      }),
      ...(bookId && {
        bookId: typeof bookId === 'string' ? new ObjectId(bookId) : bookId,
      }),
    };

    await notificationsCollection.insertOne(newNotification);
    console.log(`Notification created for user ${userId}: ${message}`);

    // Optionally, send an email notification if the user has email enabled
    const user = await db
      .collection<User>('users')
      .findOne({ _id: new ObjectId(userId) });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: `New Notification: ${message.substring(0, 50)}...`,
        html: `<p>Dear ${
          user.name || 'User'
        },</p><p>${message}</p><p>Please log in to the library system to view details.</p>`,
      });
      console.log(`Email notification sent to ${user.email}`);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function markNotificationAsRead(
  notificationId: string | ObjectId
) {
  try {
    const db = await getDatabase();
    const notificationsCollection =
      db.collection<Notification>('notifications');

    const result = await notificationsCollection.updateOne(
      {
        _id:
          typeof notificationId === 'string'
            ? new ObjectId(notificationId)
            : notificationId,
      },
      { $set: { read: true } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function deleteNotificationById(
  notificationId: string | ObjectId
) {
  try {
    const db = await getDatabase();
    const notificationsCollection =
      db.collection<Notification>('notifications');

    const result = await notificationsCollection.deleteOne({
      _id:
        typeof notificationId === 'string'
          ? new ObjectId(notificationId)
          : notificationId,
    });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}
