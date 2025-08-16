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
    | string; // Added string for flexibility
  isbn?: string;
  bookId: string; // Unique identifier for the book
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
  role: 'Intern' | 'Lawyer' | 'Staff' | 'Partner' | 'Associate' | string; // Added string for flexibility
  phone: string;
  email?: string;
  memberId: string; // Unique ID for the borrower
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LendingRecord {
  _id?: ObjectId | string; // Use ObjectId for internal representation
  bookId: ObjectId | string; // Reference to Book._id
  borrowerId: ObjectId | string; // Reference to Borrower._id
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: 'borrowed' | 'returned' | 'overdue';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Populated fields for client-side display (optional, for convenience)
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
  _id?: ObjectId | string; // Use ObjectId for internal representation
  userId: ObjectId | string; // Reference to User._id
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

// New interfaces for Case Management System
export interface Case {
  _id?: ObjectId | string;
  caseId: string; // Unique identifier for the case (e.g., "RNCL-2023-001")
  title: string;
  description?: string;
  status: 'Open' | 'Closed' | 'Pending' | 'Archived' | string;
  clientName: string;
  assignedTo?: ObjectId | string; // Reference to User._id (e.g., the lawyer/staff assigned)
  createdAt?: Date;
  updatedAt?: Date;
  // Populated field for client-side display
  assignedUser?: User;
}

// export interface Document {
//   _id?: ObjectId | string;
//   caseId: ObjectId | string; // Reference to Case._id
//   title: string;
//   content: string; // Can store text, HTML, or Markdown
//   fileUrl?: string; // URL for uploaded files (e.g., PDF, image)
//   cloudinaryPublicId?: string; // New field to store Cloudinary public ID for deletion
//   type: 'text' | 'pdf' | 'image' | 'word' | 'other' | string; // Type of document
//   createdAt?: Date;
//   updatedAt?: Date;
//   // Populated field for client-side display
//   case?: Case;
// }

export interface Document {
  _id?: ObjectId | string;
  caseId: ObjectId | string;
  title: string;
  content: string;
  fileUrl?: string;
  cloudinaryPublicId?: string;
  type: 'text' | 'pdf' | 'image' | 'word' | 'other' | string;
  signature?: string;
  signedBy?: string;
  signedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  case?: Case;
}
