-- MongoDB Collections Schema Documentation
-- This file documents the structure of MongoDB collections for the Ralph Nwosu & Co. Library System

-- Connect to your MongoDB database:
-- mongo "mongodb+srv://<username>:<password>@<cluster-url>/library_system?retryWrites=true&w=majority"

-- Create collections (if they don't exist, they will be created on first insert)
-- db.createCollection("users")
-- db.createCollection("books")
-- db.createCollection("borrowers")
-- db.createCollection("lendings")
-- db.createCollection("notifications")

-- Books Collection
-- Collection: books
-- Purpose: Store information about all books in the library
/*
{
  "_id": ObjectId,
  "title": String (required),
  "author": String (required),
  "category": String (enum: "Textbook", "Statute", "Law Report", "Case Law", "Journal", "Reference"),
  "isbn": String (optional),
  "bookId": String (unique, auto-generated like "RN-0001"),
  "totalCopies": Number (required, min: 1),
  "availableCopies": Number (calculated, initially equals totalCopies),
  "shelfLocation": String (required),
  "keywords": Array of Strings (for search functionality),
  "coverImage": String (optional, URL to image),
  "publishedYear": Number (optional),
  "genre": String (optional),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Borrowers Collection
-- Collection: borrowers
-- Purpose: Store information about people who can borrow books
/*
{
  "_id": ObjectId,
  "name": String (required),
  "role": String (enum: "Intern", "Lawyer", "Staff", "Partner", "Associate"),
  "phone": String (required),
  "email": String (optional),
  "address": String (optional),
  "memberId": String (unique, auto-generated),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Lending Records Collection
-- Collection: lendings
-- Purpose: Track all book lending transactions
/*
{
  "_id": ObjectId,
  "bookId": ObjectId (reference to books collection),
  "borrowerId": ObjectId (reference to borrowers collection),
  "borrowDate": Date (required),
  "dueDate": Date (required),
  "returnDate": Date (optional, set when book is returned),
  "status": String (enum: "borrowed", "returned", "overdue"),
  "notes": String (optional),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Users Collection
-- Collection: users
-- Purpose: Store system users with authentication and role-based permissions
/*
{
  "_id": ObjectId,
  "name": String (required),
  "email": String (required, unique),
  "password": String (required, hashed),
  "role": String (enum: "Super Admin", "Admin", "Librarian", "User"),
  "permissions": Array of Strings (based on role),
  "isActive": Boolean (default: true),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- Notifications Collection
-- Collection: notifications
-- Purpose: Store notifications for users
/*
{
  "_id": ObjectId,
  "userId": ObjectId (reference to users collection),
  "message": String (required),
  "type": String (required),
  "read": Boolean (default: false),
  "createdAt": Date,
  "updatedAt": Date
}
*/

-- NextAuth Collections (automatically created by NextAuth)
-- Collection: accounts - OAuth account information
-- Collection: sessions - User session data
-- Collection: users - NextAuth user data (separate from our custom users collection)
-- Collection: verification_tokens - Email verification tokens

-- Indexes for Performance
-- Create these indexes in MongoDB for better query performance:

-- Books Collection Indexes
-- db.books.createIndex({ "title": "text", "author": "text", "keywords": "text" })
-- db.books.createIndex({ "bookId": 1 }, { unique: true })
-- db.books.createIndex({ "category": 1 })
-- db.books.createIndex({ "availableCopies": 1 })
-- db.books.createIndex({ "publishedYear": 1 })
-- db.books.createIndex({ "genre": 1 })

-- Borrowers Collection Indexes
-- db.borrowers.createIndex({ "name": "text", "phone": "text", "email": "text" })
-- db.borrowers.createIndex({ "role": 1 })
-- db.borrowers.createIndex({ "memberId": 1 }, { unique: true })

-- Lendings Collection Indexes
-- db.lendings.createIndex({ "bookId": 1 })
-- db.lendings.createIndex({ "borrowerId": 1 })
-- db.lendings.createIndex({ "status": 1 })
-- db.lendings.createIndex({ "dueDate": 1 })
-- db.lendings.createIndex({ "borrowDate": -1 })

-- Users Collection Indexes
-- db.users.createIndex({ "email": 1 }, { unique: true })
-- db.users.createIndex({ "role": 1 })
-- db.users.createIndex({ "isActive": 1 })

-- Notifications Collection Indexes
-- db.notifications.createIndex({ "userId": 1 })
-- db.notifications.createIndex({ "read": 1 })

-- Sample Data for Testing
-- You can insert this sample data to test the system:

-- Sample Books
/*
db.books.insertMany([
  {
    "title": "Nigerian Constitutional Law",
    "author": "Ben Nwabueze",
    "category": "Textbook",
    "isbn": "978-123456789",
    "bookId": "RN-0001",
    "totalCopies": 3,
    "availableCopies": 3,
    "shelfLocation": "A1-B2",
    "keywords": ["constitutional law", "nigeria", "government"],
    "publishedYear": 2020,
    "genre": "Law",
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "title": "Criminal Law in Nigeria",
    "author": "Karibi-Whyte",
    "category": "Textbook",
    "bookId": "RN-0002",
    "totalCopies": 2,
    "availableCopies": 2,
    "shelfLocation": "B1-C3",
    "keywords": ["criminal law", "nigeria", "procedure"],
    "publishedYear": 2018,
    "genre": "Law",
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    title: "The Law of Contract",
    author: "Ewan McKendrick",
    category: "Textbook",
    isbn: "978-0198749441",
    bookId: "TXB001",
    totalCopies: 5,
    availableCopies: 5,
    shelfLocation: "A1-01",
    keywords: ["contract", "law", "textbook"],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Criminal Code Act",
    author: "Federal Republic of Nigeria",
    category: "Statute",
    isbn: "978-9780280000",
    bookId: "STA001",
    totalCopies: 3,
    availableCopies: 3,
    shelfLocation: "B2-05",
    keywords: ["criminal", "code", "statute", "nigeria"],
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
*/

-- Sample Borrowers
/*
db.borrowers.insertMany([
  {
    "name": "John Doe",
    "role": "Intern",
    "phone": "+234-801-234-5678",
    "email": "john.doe@example.com",
    "address": "123 Main St, Lagos",
    "memberId": "MB-0001",
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "name": "Jane Smith",
    "role": "Lawyer",
    "phone": "+234-802-345-6789",
    "email": "jane.smith@example.com",
    "address": "456 Park Ave, Abuja",
    "memberId": "MB-0002",
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    name: "John Doe",
    role: "Intern",
    phone: "123-456-7890",
    email: "john.doe@example.com",
    memberId: "BRW001",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Jane Smith",
    role: "Lawyer",
    phone: "098-765-4321",
    email: "jane.smith@example.com",
    memberId: "BRW002",
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
*/

-- Sample Admin User (password: "admin123")
/*
db.users.insertOne({
  "name": "System Administrator",
  "email": "admin@ralphnwosu.com",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G",
  "role": "Super Admin",
  "permissions": [
    "books:read", "books:create", "books:update", "books:delete",
    "borrowers:read", "borrowers:create", "borrowers:update", "borrowers:delete",
    "lendings:read", "lendings:create", "lendings:update", "lendings:delete",
    "users:read", "users:create", "users:update", "users:delete",
    "reports:read", "reports:export",
    "system:admin"
  ],
  "isActive": true,
  "createdAt": new Date(),
  "updatedAt": new Date()
})
*/

-- Sample Notifications
/*
db.notifications.insertMany([
  {
    "userId": ObjectId("someUserId"),
    "message": "Your book is due soon.",
    "type": "reminder",
    "read": false,
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "userId": ObjectId("anotherUserId"),
    "message": "Welcome to Ralph Nwosu & Co. Library System!",
    "type": "welcome",
    "read": true,
    "createdAt": new Date(),
    "updatedAt": new Date()
  }
])
*/

-- Insert initial users
/*
db.users.insertMany([
  {
    name: "Admin User",
    email: "admin@example.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G", -- Replace with a bcrypt hashed password
    role: "Admin",
    permissions: [
      "dashboard:read", "books:read", "books:create", "books:update", "books:delete",
      "borrowers:read", "borrowers:create", "borrowers:update", "borrowers:delete",
      "lendings:read", "lendings:create", "lendings:update", "lendings:delete",
      "notifications:read", "notifications:create"
    ],
    createdAt: ISODate(),
    updatedAt: ISODate()
  },
  {
    name: "Librarian User",
    email: "librarian@example.com",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G", -- Replace with a bcrypt hashed password
    role: "Librarian",
    permissions: [
      "dashboard:read", "books:read", "borrowers:read", "lendings:read",
      "notifications:read"
    ],
    createdAt: ISODate(),
    updatedAt: ISODate()
  },
  {
    name: "Super Admin",
    email: "admin@example.com",
    password: "hashed_password_here", -- Use a hashed password!
    role: "Super Admin",
    permissions: ["dashboard:read", "books:read", "books:create", "books:update", "books:delete", "borrowers:read", "borrowers:create", "borrowers:update", "borrowers:delete", "lendings:read", "lendings:create", "lendings:update", "notifications:read", "notifications:create", "notifications:update", "notifications:delete", "users:read", "users:create", "users:update", "users:delete", "api_docs:read"],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);
*/

-- Insert initial books
/*
db.books.insertMany([
  {
    title: "The Law of Contract",
    author: "Ewan McKendrick",
    category: "Textbook",
    isbn: "9780198749441",
    bookId: "B001",
    totalCopies: 5,
    availableCopies: 5,
    shelfLocation: "A1-01",
    keywords: ["contract", "law", "textbook"],
    createdAt: ISODate(),
    updatedAt: ISODate()
  },
  {
    title: "Criminal Law",
    author: "Jonathan Herring",
    category: "Textbook",
    isbn: "9780198848281",
    bookId: "B002",
    totalCopies: 3,
    availableCopies: 3,
    shelfLocation: "A1-02",
    keywords: ["criminal", "law", "textbook"],
    createdAt: ISODate(),
    updatedAt: ISODate()
  },
  {
    title: "Contract Law Basics",
    author: "John Doe",
    category: "Textbook",
    isbn: "978-1234567890",
    bookId: "B003",
    totalCopies: 5,
    availableCopies: 5,
    shelfLocation: "A1",
    keywords: ["contract", "law", "basics"],
    createdAt: ISODate(),
    updatedAt: ISODate()
  },
  {
    title: "Criminal Procedure Act",
    author: "Legislature",
    category: "Statute",
    isbn: "978-0987654321",
    bookId: "B004",
    totalCopies: 2,
    availableCopies: 2,
    shelfLocation: "B2",
    keywords: ["criminal", "procedure", "act"],
    createdAt: ISODate(),
    updatedAt: ISODate()
  }
]);
*/

-- Insert initial borrowers
/*
db.borrowers.insertMany([
  {
    name: "Alice Smith",
    role: "Lawyer",
    phone: "123-456-7890",
    email: "alice@example.com",
    memberId: "M001",
    createdAt: ISODate(),
    updatedAt: ISODate()
  },
  {
    name: "Bob Johnson",
    role: "Intern",
    phone: "098-765-4321",
    email: "bob@example.com",
    memberId: "M002",
    createdAt: ISODate(),
    updatedAt: ISODate()
  }
]);
*/
