import { createUserLoader } from '../dataloaders';
import { PrismaClient, User } from '@prisma/client';

// Mock the PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Get the mocked prisma instance
const prisma = new PrismaClient();

describe('Dataloaders', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    (prisma.user.findMany as jest.Mock).mockClear();
  });

  describe('createUserLoader', () => {
    it('should create a new DataLoader', () => {
      const loader = createUserLoader();
      expect(loader).toBeDefined();
      expect(typeof loader.load).toBe('function');
    });

    it('should batch and fetch users', async () => {
      const users: User[] = [
        { id: '1', email: 'user1@example.com', password: 'password', createdAt: new Date(), updatedAt: new Date(), emailVerified: null, name: null, role: 'USER' },
        { id: '2', email: 'user2@example.com', password: 'password', createdAt: new Date(), updatedAt: new Date(), emailVerified: null, name: null, role: 'USER' },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const loader = createUserLoader();
      const result = await loader.loadMany(['1', '2']);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['1', '2'],
          },
        },
      });

      expect(result).toEqual(users);
    });

    it('should return null for non-existent users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const loader = createUserLoader();
      const user = await loader.load('3');

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['3'],
          },
        },
      });

      expect(user).toBeNull();
    });
  });
});
