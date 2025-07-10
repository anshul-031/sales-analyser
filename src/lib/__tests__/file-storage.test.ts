import { FileStorage } from '../file-storage'
import { AnalysisStatus } from '../../types/enums'

// Mock dependencies
jest.mock('fs/promises')
jest.mock('os')
jest.mock('@aws-sdk/client-s3')
jest.mock('../utils')

const mockFs = jest.requireMock('fs/promises')
const mockOs = jest.requireMock('os')

describe('FileStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOs.tmpdir.mockReturnValue('/tmp')
    mockFs.readFile.mockResolvedValue('[]')
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.access.mockResolvedValue(undefined)
  })

  describe('createUpload', () => {
    it('should create a new upload record', async () => {
      const uploadData = {
        filename: 'test.mp3',
        originalName: 'Test Audio.mp3',
        fileSize: 1024000,
        mimeType: 'audio/mpeg',
        fileUrl: './uploads/test.mp3',
        userId: 'user123',
      }

      const result = await FileStorage.createUpload(uploadData)

      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        filename: 'test.mp3',
        originalName: 'Test Audio.mp3',
        fileSize: 1024000,
        mimeType: 'audio/mpeg',
        fileUrl: './uploads/test.mp3',
        userId: 'user123',
        uploadedAt: expect.any(String),
      }))
    })

    it('should generate unique IDs for uploads', async () => {
      const uploadData = {
        filename: 'test.mp3',
        originalName: 'Test Audio.mp3',
        fileSize: 1024000,
        mimeType: 'audio/mpeg',
        fileUrl: './uploads/test.mp3',
        userId: 'user123',
      }

      const result1 = await FileStorage.createUpload(uploadData)
      const result2 = await FileStorage.createUpload(uploadData)

      expect(result1.id).not.toBe(result2.id)
    })
  })

  describe('createAnalysis', () => {
    it('should create a new analysis record', async () => {
      const mockUpload = {
        id: 'upload123',
        filename: 'test.mp3',
        originalName: 'Test Audio.mp3',
        fileSize: 1024000,
        mimeType: 'audio/mpeg',
        fileUrl: './uploads/test.mp3',
        userId: 'user123',
        uploadedAt: '2023-01-01T00:00:00Z',
      }

      const analysisData = {
        status: 'PENDING' as const,
        analysisType: 'default' as const,
        userId: 'user123',
        uploadId: 'upload123',
      }

      const result = await FileStorage.createAnalysis(analysisData, mockUpload)

      expect(result).toEqual(expect.objectContaining({
        id: expect.any(String),
        status: 'PENDING',
        analysisType: 'default',
        userId: 'user123',
        uploadId: 'upload123',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }))
    })
  })

  describe('getUploadsByUser', () => {
    it('should return uploads for a specific user', async () => {
      const mockUploads = [
        {
          id: 'upload1',
          userId: 'user123',
          filename: 'test1.mp3',
          originalName: 'Test 1.mp3',
          fileSize: 1024,
          mimeType: 'audio/mpeg',
          fileUrl: './uploads/test1.mp3',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'upload2',
          userId: 'user456',
          filename: 'test2.mp3',
          originalName: 'Test 2.mp3',
          fileSize: 2048,
          mimeType: 'audio/mpeg',
          fileUrl: './uploads/test2.mp3',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'upload3',
          userId: 'user123',
          filename: 'test3.mp3',
          originalName: 'Test 3.mp3',
          fileSize: 3072,
          mimeType: 'audio/mpeg',
          fileUrl: './uploads/test3.mp3',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        }
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUploads))

      const result = await FileStorage.getUploadsByUser('user123')

      expect(result).toHaveLength(2)
      expect(result.every(upload => upload.userId === 'user123')).toBe(true)
    })

    it('should return empty array for user with no uploads', async () => {
      mockFs.readFile.mockResolvedValue('[]')

      const result = await FileStorage.getUploadsByUser('nonexistent')

      expect(result).toEqual([])
    })
  })

  describe('updateAnalysis', () => {
    it('should update existing analysis', async () => {
      const existingAnalyses = [
        {
          id: 'analysis1',
          status: 'PENDING',
          userId: 'user123',
          uploadId: 'upload123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        }
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingAnalyses))

      const updates = {
        status: 'COMPLETED' as const,
        transcription: 'Test transcription',
        analysisResult: { summary: 'Test summary' },
      }

      const result = await FileStorage.updateAnalysis('analysis1', updates)

      expect(result).toEqual(expect.objectContaining({
        id: 'analysis1',
        status: 'COMPLETED',
        transcription: 'Test transcription',
        analysisResult: { summary: 'Test summary' },
        updatedAt: expect.any(String),
      }))
    })

    it('should return null for non-existent analysis', async () => {
      mockFs.readFile.mockResolvedValue('[]')

      const result = await FileStorage.updateAnalysis('nonexistent', { status: 'COMPLETED' as const })

      expect(result).toBeNull()
    })
  })

  describe('getAnalysesByUser', () => {
    it('should return analyses for a specific user', async () => {
      const mockAnalyses = [
        {
          id: 'analysis1',
          userId: 'user123',
          status: 'COMPLETED',
          uploadId: 'upload1',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
        {
          id: 'analysis2',
          userId: 'user456',
          status: 'PENDING',
          uploadId: 'upload2',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        }
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockAnalyses))

      const result = await FileStorage.getAnalysesByUser('user123')

      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user123')
    })
  })

  describe('deleteUploadedFile', () => {
    it('should delete upload file and return true if found', async () => {
      const mockUploads = [
        {
          id: 'upload1',
          userId: 'user123',
          filename: 'test1.mp3',
          originalName: 'Test 1.mp3',
          fileSize: 1024,
          mimeType: 'audio/mpeg',
          fileUrl: './uploads/test1.mp3',
          uploadedAt: '2023-01-01T00:00:00Z',
        }
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUploads))

      const result = await FileStorage.deleteUploadedFile('upload1')

      expect(result).toBe(true)
    })

    it('should return false if upload not found', async () => {
      mockFs.readFile.mockResolvedValue('[]')

      const result = await FileStorage.deleteUploadedFile('nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const mockUploads = [
        { id: 'upload1', userId: 'user123' },
        { id: 'upload2', userId: 'user456' }
      ]

      const mockAnalyses = [
        { id: 'analysis1', status: 'COMPLETED', userId: 'user123' },
        { id: 'analysis2', status: 'FAILED', userId: 'user456' },
        { id: 'analysis3', status: 'PENDING', userId: 'user123' }
      ]

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockUploads))
        .mockResolvedValueOnce(JSON.stringify(mockAnalyses))

      const result = await FileStorage.getStats()

      expect(result).toEqual({
        totalUploads: 2,
        totalAnalyses: 3,
        completedAnalyses: 1,
        failedAnalyses: 1,
      })
    })
  })

  describe('getUploadsWithAnalyses', () => {
    it('should return uploads with their analyses', async () => {
      const mockUploads = [
        {
          id: 'upload1',
          userId: 'user123',
          filename: 'test1.mp3',
          originalName: 'Test 1.mp3',
          fileSize: 1024,
          mimeType: 'audio/mpeg',
          fileUrl: './uploads/test1.mp3',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        }
      ]

      const mockAnalyses = [
        {
          id: 'analysis1',
          uploadId: 'upload1',
          status: 'COMPLETED',
          userId: 'user123',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        }
      ]

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockUploads))
        .mockResolvedValueOnce(JSON.stringify(mockAnalyses))

      const result = await FileStorage.getUploadsWithAnalyses('user123')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'upload1',
        hasAnalysis: true,
        analyses: expect.arrayContaining([
          expect.objectContaining({
            id: 'analysis1',
            status: 'COMPLETED'
          })
        ])
      }))
    })
  })

  describe('clearUserData', () => {
    it('should remove all user data', async () => {
      const mockUploads = [
        { id: 'upload1', userId: 'user123' },
        { id: 'upload2', userId: 'user456' }
      ]

      const mockAnalyses = [
        { id: 'analysis1', userId: 'user123' },
        { id: 'analysis2', userId: 'user456' }
      ]

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockUploads)) // for getUploadsByUser
        .mockResolvedValueOnce(JSON.stringify(mockUploads)) // for clearUserData uploads read
        .mockResolvedValueOnce(JSON.stringify(mockAnalyses)) // for clearUserData analyses read

      await FileStorage.clearUserData('user123')

      // Should write files with user123 data removed
      expect(mockFs.writeFile).toHaveBeenNthCalledWith(1,
        expect.stringContaining('uploads.json'),
        JSON.stringify([{ id: 'upload2', userId: 'user456' }], null, 2),
        'utf8'
      )

      expect(mockFs.writeFile).toHaveBeenNthCalledWith(2,
        expect.stringContaining('analyses.json'),
        JSON.stringify([{ id: 'analysis2', userId: 'user456' }], null, 2),
        'utf8'
      )
    })
  })

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const result = await FileStorage.getUploadsByUser('user123')

      expect(result).toEqual([])
    })

    it('should handle file write errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'))
      mockFs.readFile.mockResolvedValue('[]')

      const uploadData = {
        filename: 'test.mp3',
        originalName: 'Test Audio.mp3',
        fileSize: 1024000,
        mimeType: 'audio/mpeg',
        fileUrl: './uploads/test.mp3',
        userId: 'user123',
      }

      await expect(FileStorage.createUpload(uploadData)).rejects.toThrow('Write error')
    })
  })
})
