/** @format */

import type { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId | string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: 'User' | 'Librarian' | 'Admin' | 'Super Admin';
  permissions: string[];
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Book {
  _id?: ObjectId | string;
  title: string;
  author: string;
  category:
    | 'Textbook'
    | 'Statute'
    | 'Law Report'
    | 'Case Law'
    | 'Journal'
    | 'Reference'
    | string;
  isbn?: string;
  bookId: string;
  totalCopies: number;
  availableCopies: number;
  shelfLocation: string;
  keywords?: string[];
  coverImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Borrower {
  _id?: ObjectId | string;
  name: string;
  role: 'Intern' | 'Lawyer' | 'Staff' | 'Partner' | 'Associate' | string;
  phone: string;
  email?: string;
  memberId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LendingRecord {
  _id?: ObjectId | string;
  bookId: ObjectId | string;
  borrowerId: ObjectId | string;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: 'borrowed' | 'returned' | 'overdue';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;

  book?: Book;
  borrower?: Borrower;
}

export interface DashboardStats {
  totalBooks: number;
  totalBorrowers: number;
  activeLendings: number;
  overdueBooks: number;
  availableBooks: number;
  mostBorrowedBooks: Array<{
    title: string;
    author: string;
    borrowCount: number;
  }>;
}

export interface Notification {
  _id?: ObjectId | string;
  userId: ObjectId | string;
  message: string;
  type:
    | 'info'
    | 'warning'
    | 'error'
    | 'success'
    | 'overdue_reminder'
    | 'book_available'
    | 'system_alert';
  read: boolean;
  createdAt?: Date;
  lendingId?: ObjectId | string;
  bookId?: ObjectId | string;
}
