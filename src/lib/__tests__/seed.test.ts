import { connectToDatabase, disconnectFromDatabase, DatabaseStorage } from '../db';
import { Logger } from '../utils';

// Mock dependencies
jest.mock('../db', () => ({
  connectToDatabase: jest.fn(),
  disconnectFromDatabase: jest.fn(),
  DatabaseStorage: {
    createUser: jest.fn(),
  },
}));

jest.mock('../utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as (code?: number) => never);

describe('Database Seeding Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should seed the database successfully', async () => {
    (connectToDatabase as jest.Mock).mockResolvedValue(true);
    (DatabaseStorage.createUser as jest.Mock).mockResolvedValue(undefined);

    await jest.isolateModulesAsync(async () => {
      await require('../seed');
    });

    expect(connectToDatabase).toHaveBeenCalled();
    expect(DatabaseStorage.createUser).toHaveBeenCalledWith('test-user-1');
    expect(Logger.info).toHaveBeenCalledWith('[Seed] Starting database seeding...');
    expect(Logger.info).toHaveBeenCalledWith('[Seed] Created test user:', 'test-user-1');
    expect(Logger.info).toHaveBeenCalledWith('[Seed] Database seeding completed successfully');
    expect(disconnectFromDatabase).toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should handle failure to connect to the database', async () => {
    (connectToDatabase as jest.Mock).mockResolvedValue(false);

    await jest.isolateModulesAsync(async () => {
      await require('../seed');
    });

    expect(connectToDatabase).toHaveBeenCalled();
    expect(DatabaseStorage.createUser).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalledWith('[Seed] Database seeding failed:', new Error('Failed to connect to database'));
    expect(disconnectFromDatabase).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors during seeding', async () => {
    const testError = new Error('Test error');
    (connectToDatabase as jest.Mock).mockResolvedValue(true);
    (DatabaseStorage.createUser as jest.Mock).mockRejectedValue(testError);

    await jest.isolateModulesAsync(async () => {
      await require('../seed');
    });

    expect(connectToDatabase).toHaveBeenCalled();
    expect(DatabaseStorage.createUser).toHaveBeenCalledWith('test-user-1');
    expect(Logger.error).toHaveBeenCalledWith('[Seed] Database seeding failed:', testError);
    expect(disconnectFromDatabase).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle unexpected errors in main', async () => {
    const unexpectedError = new Error('Unexpected error');
    (connectToDatabase as jest.Mock).mockRejectedValue(unexpectedError);

    await jest.isolateModulesAsync(async () => {
      await require('../seed');
    });

    expect(Logger.error).toHaveBeenCalledWith('[Seed] Database seeding failed:', unexpectedError);
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle errors in the final catch block', async () => {
    const finalError = new Error('Final error');
    (connectToDatabase as jest.Mock).mockResolvedValue(true);
    (disconnectFromDatabase as jest.Mock).mockRejectedValue(finalError);

    await jest.isolateModulesAsync(async () => {
      await require('../seed');
    });

    expect(Logger.error).toHaveBeenCalledWith('[Seed] Unexpected error:', finalError);
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});