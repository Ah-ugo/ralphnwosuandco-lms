/** @format */

import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Library Management System API',
        version: '1.0',
        description: 'API documentation for the Library Management System',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          User: {
            type: 'object',
            properties: {
              _id: { type: 'string', format: 'objectId' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: {
                type: 'string',
                enum: ['User', 'Librarian', 'Admin', 'Super Admin'],
              },
              permissions: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Book: {
            type: 'object',
            properties: {
              _id: { type: 'string', format: 'objectId' },
              title: { type: 'string' },
              author: { type: 'string' },
              category: {
                type: 'string',
                enum: [
                  'Textbook',
                  'Statute',
                  'Law Report',
                  'Case Law',
                  'Journal',
                  'Reference',
                ],
              },
              isbn: { type: 'string' },
              bookId: { type: 'string' },
              totalCopies: { type: 'integer' },
              availableCopies: { type: 'integer' },
              shelfLocation: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              coverImage: { type: 'string', format: 'url' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Borrower: {
            type: 'object',
            properties: {
              _id: { type: 'string', format: 'objectId' },
              name: { type: 'string' },
              role: {
                type: 'string',
                enum: ['Intern', 'Lawyer', 'Staff', 'Partner', 'Associate'],
              },
              phone: { type: 'string' },
              email: { type: 'string', format: 'email' },
              memberId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          LendingRecord: {
            type: 'object',
            properties: {
              _id: { type: 'string', format: 'objectId' },
              bookId: { type: 'string', format: 'objectId' },
              borrowerId: { type: 'string', format: 'objectId' },
              borrowDate: { type: 'string', format: 'date-time' },
              dueDate: { type: 'string', format: 'date-time' },
              returnDate: { type: 'string', format: 'date-time' },
              status: {
                type: 'string',
                enum: ['borrowed', 'returned', 'overdue'],
              },
              notes: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              book: { $ref: '#/components/schemas/Book' }, // Populated book details
              borrower: { $ref: '#/components/schemas/Borrower' }, // Populated borrower details
            },
          },
          DashboardStats: {
            type: 'object',
            properties: {
              totalBooks: { type: 'integer' },
              availableBooks: { type: 'integer' },
              activeLendings: { type: 'integer' },
              overdueBooks: { type: 'integer' },
              totalBorrowers: { type: 'integer' },
              mostBorrowedBooks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string', format: 'objectId' },
                    title: { type: 'string' },
                    author: { type: 'string' },
                    borrowCount: { type: 'integer' },
                  },
                },
              },
            },
          },
          Notification: {
            type: 'object',
            properties: {
              _id: { type: 'string', format: 'objectId' },
              userId: { type: 'string', format: 'objectId' },
              message: { type: 'string' },
              type: {
                type: 'string',
                enum: [
                  'info',
                  'warning',
                  'error',
                  'success',
                  'overdue_reminder',
                  'book_available',
                  'system_alert',
                ],
              },
              read: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              lendingId: { type: 'string', format: 'objectId' },
              bookId: { type: 'string', format: 'objectId' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
      servers: [
        {
          url: '/api',
          description: 'Current API server',
        },
      ],
    },
  });
  return spec;
};
