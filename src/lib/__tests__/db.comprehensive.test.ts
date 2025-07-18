// Mock Prisma client before importing the db module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    upload: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    analysis: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
    $use: jest.fn(),
  })),
}));

import { DatabaseStorage } from '../db';

describe('DatabaseStorage', () => {
  it('should exist', () => {
    expect(DatabaseStorage).toBeDefined();
  });
});
