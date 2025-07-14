import { GET, POST, PUT } from '../route';
import { NextRequest } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { Logger } from '@/lib/utils';
import { ActionItemStatus, ActionItemPriority, AnalysisStatus, AnalysisType } from '@prisma/client';

jest.mock('@/lib/db');
jest.mock('@/lib/auth');
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
const mockedGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;

describe('/api/action-items', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return action items for a given analysisId', async () => {
      const user = { id: 'user-1' };
      const analysisId = 'analysis-1';
      const actionItems = [{
        id: 'item-1',
        title: 'Test Action Item',
        analysisId: 'analysis-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ActionItemStatus.NOT_STARTED,
        description: null,
        priority: ActionItemPriority.MEDIUM,
        deadline: null,
        comments: null,
      }];
      
      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getActionItemsByAnalysisId.mockResolvedValue(actionItems);

      const req = new NextRequest(`http://localhost?analysisId=${analysisId}`);
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.actionItems).toEqual(actionItems.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })));
      expect(mockedDatabaseStorage.getActionItemsByAnalysisId).toHaveBeenCalledWith(analysisId);
    });

    it('should return action items for a user with filters', async () => {
      const user = { id: 'user-1' };
      const actionItems = [{
        id: 'item-1',
        title: 'Test Action Item',
        analysisId: 'analysis-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ActionItemStatus.NOT_STARTED,
        description: null,
        priority: ActionItemPriority.MEDIUM,
        deadline: null,
        comments: null,
        analysis: {
            id: 'analysis-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            status: AnalysisStatus.COMPLETED,
            analysisType: AnalysisType.DEFAULT,
            customPrompt: null,
            customParameters: null,
            transcription: null,
            analysisResult: null,
            errorMessage: null,
            analysisDuration: null,
            userId: 'user-1',
            uploadId: 'upload-1',
            upload: {
                id: 'upload-1',
                filename: 'test.wav',
                originalName: 'test.wav',
                fileSize: BigInt(1234),
                mimeType: 'audio/wav',
                fileUrl: 'http://localhost/test.wav',
                uploadedAt: new Date(),
                userId: 'user-1',
            }
        }
      }];
      
      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getActionItemsByUserId.mockResolvedValue(actionItems);

      const req = new NextRequest('http://localhost?status=NOT_STARTED&priority=MEDIUM');
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.actionItems).toEqual(actionItems.map(item => {
        const { analysis, ...rest } = item;
        const { upload, ...restAnalysis } = analysis;
        const { fileSize, ...restUpload } = upload;
        return {
          ...rest,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          analysis: {
            ...restAnalysis,
            createdAt: analysis.createdAt.toISOString(),
            updatedAt: analysis.updatedAt.toISOString(),
            upload: {
              ...restUpload,
              fileSize: fileSize.toString(),
              uploadedAt: upload.uploadedAt.toISOString(),
            }
          }
        }
      }));
      expect(mockedDatabaseStorage.getActionItemsByUserId).toHaveBeenCalledWith(user.id, {
        status: 'NOT_STARTED',
        priority: 'MEDIUM',
        timeframe: 'all',
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockedGetAuthenticatedUser.mockResolvedValue(null);

      const req = new NextRequest('http://localhost');
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Authentication required');
    });

    it('should return 500 on error', async () => {
      const user = { id: 'user-1' };
      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getActionItemsByAnalysisId.mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost?analysisId=analysis-1');
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Failed to retrieve action items');
    });
  });

  describe('POST', () => {
    it('should create an action item', async () => {
      const user = { id: 'user-1' };
      const analysis = { id: 'analysis-1', userId: 'user-1' };
      const actionItem = {
        id: 'item-1',
        title: 'New Action Item',
        analysisId: 'analysis-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ActionItemStatus.NOT_STARTED,
        description: null,
        priority: ActionItemPriority.MEDIUM,
        deadline: null,
        comments: null,
      };

      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getAnalysisById.mockResolvedValue(analysis as any);
      mockedDatabaseStorage.createActionItem.mockResolvedValue(actionItem as any);

      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ analysisId: 'analysis-1', title: 'New Action Item' }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.actionItem).toEqual({ ...actionItem, createdAt: actionItem.createdAt.toISOString(), updatedAt: actionItem.updatedAt.toISOString() });
    });

    it('should return 400 if analysisId or title is missing', async () => {
      const user = { id: 'user-1' };
      mockedGetAuthenticatedUser.mockResolvedValue(user);

      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ analysisId: 'analysis-1' }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Analysis ID and title are required');
    });

    it('should return 404 if analysis not found or access denied', async () => {
      const user = { id: 'user-1' };
      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getAnalysisById.mockResolvedValue(null);

      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ analysisId: 'analysis-1', title: 'New Action Item' }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Analysis not found or access denied');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockedGetAuthenticatedUser.mockResolvedValue(null);

      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ analysisId: 'analysis-1', title: 'New Action Item' }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Authentication required');
    });

    it('should return 500 on error', async () => {
      const user = { id: 'user-1' };
      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getAnalysisById.mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ analysisId: 'analysis-1', title: 'New Action Item' }),
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Failed to create action item');
    });
  });

  describe('PUT', () => {
    it('should update an action item', async () => {
      const user = { id: 'user-1' };
      const existingActionItem = {
        id: 'item-1',
        title: 'Test Action Item',
        analysisId: 'analysis-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ActionItemStatus.NOT_STARTED,
        description: null,
        priority: ActionItemPriority.MEDIUM,
        deadline: null,
        comments: null,
        analysis: {
            id: 'analysis-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            status: AnalysisStatus.COMPLETED,
            analysisType: AnalysisType.DEFAULT,
            customPrompt: null,
            customParameters: null,
            transcription: null,
            analysisResult: null,
            errorMessage: null,
            analysisDuration: null,
            userId: 'user-1',
            uploadId: 'upload-1',
            upload: {
                id: 'upload-1',
                filename: 'test.wav',
                originalName: 'test.wav',
                fileSize: BigInt(1234),
                mimeType: 'audio/wav',
                fileUrl: 'http://localhost/test.wav',
                uploadedAt: new Date(),
                userId: 'user-1',
            }
        }
      };
      const updatedActionItem = { ...existingActionItem, status: ActionItemStatus.COMPLETED };

      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getActionItemsByUserId.mockResolvedValue([existingActionItem]);
      mockedDatabaseStorage.updateActionItem.mockResolvedValue(updatedActionItem as any);

      const req = new NextRequest('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ id: 'item-1', status: 'COMPLETED' }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.actionItem.status).toBe('COMPLETED');
    });

    it('should return 400 if action item ID is missing', async () => {
      const user = { id: 'user-1' };
      mockedGetAuthenticatedUser.mockResolvedValue(user);

      const req = new NextRequest('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Action item ID is required');
    });

    it('should return 404 if action item not found', async () => {
      const user = { id: 'user-1' };
      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getActionItemsByUserId.mockResolvedValue([]);

      const req = new NextRequest('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ id: 'item-1', status: 'COMPLETED' }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Action item not found');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockedGetAuthenticatedUser.mockResolvedValue(null);

      const req = new NextRequest('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ id: 'item-1', status: 'COMPLETED' }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Authentication required');
    });

    it('should return 500 on error', async () => {
      const user = { id: 'user-1' };
      const existingActionItem = {
        id: 'item-1',
        title: 'Test Action Item',
        analysisId: 'analysis-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ActionItemStatus.NOT_STARTED,
        description: null,
        priority: ActionItemPriority.MEDIUM,
        deadline: null,
        comments: null,
        analysis: {
            id: 'analysis-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            status: AnalysisStatus.COMPLETED,
            analysisType: AnalysisType.DEFAULT,
            customPrompt: null,
            customParameters: null,
            transcription: null,
            analysisResult: null,
            errorMessage: null,
            analysisDuration: null,
            userId: 'user-1',
            uploadId: 'upload-1',
            upload: {
                id: 'upload-1',
                filename: 'test.wav',
                originalName: 'test.wav',
                fileSize: BigInt(1234),
                mimeType: 'audio/wav',
                fileUrl: 'http://localhost/test.wav',
                uploadedAt: new Date(),
                userId: 'user-1',
            }
        }
      };
      mockedGetAuthenticatedUser.mockResolvedValue(user);
      mockedDatabaseStorage.getActionItemsByUserId.mockResolvedValue([existingActionItem]);
      mockedDatabaseStorage.updateActionItem.mockRejectedValue(new Error('DB error'));

      const req = new NextRequest('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ id: 'item-1', status: 'COMPLETED' }),
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe('Failed to update action item');
    });
  });
});