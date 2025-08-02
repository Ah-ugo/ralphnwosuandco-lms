/** @format */

import type { Borrower } from './models';

export const validateBorrowerUpdate = (data: Partial<Borrower>) => {
  const errors: Record<string, string> = {};
  const allowedFields: (keyof Borrower)[] = [
    'name',
    'role',
    'phone',
    'email',
    'memberId',
  ];
  const updateFields = Object.keys(data) as (keyof Borrower)[];

  // Check for disallowed fields
  updateFields.forEach((field) => {
    if (!allowedFields.includes(field)) {
      errors[field as string] = 'Field not allowed for update';
    }
  });

  // Validate field formats if present
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      errors.name = 'Name must be a string';
    } else if (data.name.trim().length === 0) {
      errors.name = 'Name cannot be empty';
    } else if (data.name.length > 100) {
      errors.name = 'Name cannot exceed 100 characters';
    }
  }

  if (data.role !== undefined) {
    if (typeof data.role !== 'string') {
      errors.role = 'Role must be a string';
    } else if (data.role.trim().length === 0) {
      errors.role = 'Role cannot be empty';
    }
  }

  if (data.phone !== undefined) {
    if (typeof data.phone !== 'string') {
      errors.phone = 'Phone must be a string';
    } else if (!/^[0-9+\-\s]{8,20}$/.test(data.phone)) {
      errors.phone = 'Phone must be a valid phone number (8-20 digits)';
    }
  }

  if (data.email !== undefined && data.email !== '') {
    if (typeof data.email !== 'string') {
      errors.email = 'Email must be a string';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  if (data.memberId !== undefined) {
    if (typeof data.memberId !== 'string') {
      errors.memberId = 'Member ID must be a string';
    } else if (data.memberId.trim().length === 0) {
      errors.memberId = 'Member ID cannot be empty';
    } else if (data.memberId.length > 20) {
      errors.memberId = 'Member ID cannot exceed 20 characters';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// Additional validators can be added below
export const validateNewBorrower = (
  data: Omit<Borrower, '_id' | 'createdAt' | 'updatedAt'>
) => {
  const baseValidation = validateBorrowerUpdate(data);

  // Additional required field checks for new borrowers
  if (!data.name) {
    baseValidation.errors.name = 'Name is required';
  }
  if (!data.role) {
    baseValidation.errors.role = 'Role is required';
  }
  if (!data.phone) {
    baseValidation.errors.phone = 'Phone is required';
  }
  if (!data.memberId) {
    baseValidation.errors.memberId = 'Member ID is required';
  }

  baseValidation.valid = Object.keys(baseValidation.errors).length === 0;
  return baseValidation;
};
