import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';
import { DatabaseStorage } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/auth');

const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;

describe('/api/action-item-types', () => {
  const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
  });

  describe('GET', () => {
    it('should return action item types for authenticated user', async () => {
      const mockTypes = [
        {
          id: 'type1',
          name: 'Follow-up Call',
          description: 'Schedule a follow-up call',
          prompt: 'Look for mentions of scheduling calls',
          color: '#FF5733',
          enabled: true,
          userId: 'user123'
        }
      ];

      mockDatabaseStorage.getActionItemTypesByUserId.mockResolvedValue(mockTypes);

      const request = new NextRequest('http://localhost:3000/api/action-item-types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.actionItemTypes).toEqual(mockTypes);
      expect(mockDatabaseStorage.getActionItemTypesByUserId).toHaveBeenCalledWith('user123');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/action-item-types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Authentication required');
    });
  });

  describe('POST', () => {
    it('should create a new action item type', async () => {
      const newType = {
        name: 'New Type',
        description: 'A new action item type',
        prompt: 'Look for new things',
        color: '#00FF00',
        enabled: true
      };

      const createdType = { id: 'type2', ...newType, userId: 'user123' };
      mockDatabaseStorage.createActionItemType.mockResolvedValue(createdType);

      const request = new NextRequest('http://localhost:3000/api/action-item-types', {
        method: 'POST',
        body: JSON.stringify(newType)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.actionItemType).toEqual(createdType);
      expect(mockDatabaseStorage.createActionItemType).toHaveBeenCalledWith({
        ...newType,
        userId: 'user123'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteType = {
        name: 'Incomplete Type'
        // Missing description, prompt
      };

      const request = new NextRequest('http://localhost:3000/api/action-item-types', {
        method: 'POST',
        body: JSON.stringify(incompleteType)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('required');
    });
  });

  describe('PUT', () => {
    it('should update an action item type', async () => {
      const updateData = {
        id: 'type1',
        name: 'Updated Type',
        description: 'Updated description'
      };

      const updatedType = { ...updateData, userId: 'user123' };
      mockDatabaseStorage.getActionItemTypeById.mockResolvedValue({
        id: 'type1', 
        name: 'Old Type', 
        userId: 'user123'
      });
      mockDatabaseStorage.updateActionItemType.mockResolvedValue(updatedType);

      const request = new NextRequest('http://localhost:3000/api/action-item-types', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.actionItemType).toEqual(updatedType);
      expect(mockDatabaseStorage.updateActionItemType).toHaveBeenCalledWith('type1', {
        name: 'Updated Type',
        description: 'Updated description'
      });
    });
  });

  describe('DELETE', () => {
    it('should delete an action item type', async () => {
      mockDatabaseStorage.getActionItemTypeById.mockResolvedValue({
        id: 'type1', 
        name: 'Type to Delete', 
        userId: 'user123'
      });
      mockDatabaseStorage.deleteActionItemType.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/action-item-types?id=type1', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Action item type deleted successfully');
      expect(mockDatabaseStorage.deleteActionItemType).toHaveBeenCalledWith('type1');
    });
  });
});
