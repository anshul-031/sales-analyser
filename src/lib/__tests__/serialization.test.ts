import { 
  serializeBigInt, 
  serializeUpload, 
  serializeAnalysis, 
  serializeUploads, 
  serializeAnalyses 
} from '../serialization'

describe('Serialization', () => {
  describe('serializeBigInt', () => {
    it('should convert BigInt to string', () => {
      const bigIntValue = BigInt(123456789)
      const result = serializeBigInt(bigIntValue)
      expect(result).toBe('123456789')
      expect(typeof result).toBe('string')
    })

    it('should convert Date objects to ISO strings', () => {
      const date = new Date('2023-01-01T00:00:00Z')
      const result = serializeBigInt(date)
      expect(result).toBe('2023-01-01T00:00:00.000Z')
      expect(typeof result).toBe('string')
    })

    it('should handle null and undefined', () => {
      expect(serializeBigInt(null)).toBeNull()
      expect(serializeBigInt(undefined)).toBeUndefined()
    })

    it('should handle primitive values', () => {
      expect(serializeBigInt('test')).toBe('test')
      expect(serializeBigInt(42)).toBe(42)
      expect(serializeBigInt(true)).toBe(true)
    })

    it('should serialize arrays containing BigInt', () => {
      const arr = [1, BigInt(999), 'test']
      const result = serializeBigInt(arr)
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toBe(1)
      expect(result[1]).toBe('999')
      expect(result[2]).toBe('test')
    })

    it('should serialize objects with BigInt properties', () => {
      const obj = {
        id: BigInt(123),
        name: 'test',
        size: BigInt(2048)
      }
      const result = serializeBigInt(obj)
      expect(result.id).toBe('123')
      expect(result.name).toBe('test')
      expect(result.size).toBe('2048')
    })

    it('should handle nested objects', () => {
      const obj = {
        user: {
          id: BigInt(1),
          metadata: {
            fileSize: BigInt(1024),
            createdAt: new Date('2023-01-01')
          }
        }
      }
      const result = serializeBigInt(obj)
      expect(result.user.id).toBe('1')
      expect(result.user.metadata.fileSize).toBe('1024')
      expect(result.user.metadata.createdAt).toBe('2023-01-01T00:00:00.000Z')
    })

    it('should handle special date fields with Date objects', () => {
      const obj = {
        uploadedAt: new Date('2023-01-01T12:00:00Z'),
        createdAt: new Date('2023-01-02T12:00:00Z'),
        updatedAt: new Date('2023-01-03T12:00:00Z'),
        regularField: 'test'
      }
      const result = serializeBigInt(obj)
      expect(result.uploadedAt).toBe('2023-01-01T12:00:00.000Z')
      expect(result.createdAt).toBe('2023-01-02T12:00:00.000Z')
      expect(result.updatedAt).toBe('2023-01-03T12:00:00.000Z')
      expect(result.regularField).toBe('test')
    })

    it('should handle special date fields with string values', () => {
      const obj = {
        uploadedAt: '2023-01-01T12:00:00Z',
        createdAt: '2023-01-02T12:00:00Z',
        updatedAt: '2023-01-03T12:00:00Z',
        regularField: 'test'
      }
      const result = serializeBigInt(obj)
      expect(result.uploadedAt).toBe('2023-01-01T12:00:00.000Z')
      expect(result.createdAt).toBe('2023-01-02T12:00:00.000Z')
      expect(result.updatedAt).toBe('2023-01-03T12:00:00.000Z')
      expect(result.regularField).toBe('test')
    })

    it('should handle invalid date strings in special date fields', () => {
      const obj = {
        uploadedAt: 'invalid-date-string',
        createdAt: 'not-a-date',
        updatedAt: '',
        regularField: 'test'
      }
      const result = serializeBigInt(obj)
      expect(result.uploadedAt).toBe('invalid-date-string')
      expect(result.createdAt).toBe('not-a-date')
      expect(result.updatedAt).toBe('')
      expect(result.regularField).toBe('test')
    })

    it('should handle special date fields with other types', () => {
      const obj = {
        uploadedAt: { nested: 'object' },
        createdAt: null,
        updatedAt: undefined,
        regularField: 'test'
      }
      const result = serializeBigInt(obj)
      expect(result.uploadedAt).toEqual({ nested: 'object' })
      expect(result.createdAt).toBeNull()
      expect(result.updatedAt).toBeUndefined()
      expect(result.regularField).toBe('test')
    })
  })

  describe('serializeUpload', () => {
    it('should serialize upload object', () => {
      const upload = {
        id: 'upload123',
        fileSize: BigInt(1024000),
        uploadedAt: new Date('2023-01-01'),
        filename: 'test.mp3'
      }
      const result = serializeUpload(upload)
      expect(result.id).toBe('upload123')
      expect(result.fileSize).toBe('1024000')
      expect(result.uploadedAt).toBe('2023-01-01T00:00:00.000Z')
      expect(result.filename).toBe('test.mp3')
    })
  })

  describe('serializeAnalysis', () => {
    it('should serialize analysis object', () => {
      const analysis = {
        id: 'analysis123',
        uploadId: 'upload123',
        createdAt: new Date('2023-01-01'),
        results: { score: 85 }
      }
      const result = serializeAnalysis(analysis)
      expect(result.id).toBe('analysis123')
      expect(result.uploadId).toBe('upload123')
      expect(result.createdAt).toBe('2023-01-01T00:00:00.000Z')
      expect(result.results.score).toBe(85)
    })
  })

  describe('serializeUploads', () => {
    it('should serialize array of uploads', () => {
      const uploads = [
        { id: 'upload1', fileSize: BigInt(1024) },
        { id: 'upload2', fileSize: BigInt(2048) }
      ]
      const result = serializeUploads(uploads)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result[0].fileSize).toBe('1024')
      expect(result[1].fileSize).toBe('2048')
    })

    it('should handle empty array', () => {
      const result = serializeUploads([])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })

  describe('serializeAnalyses', () => {
    it('should serialize array of analyses', () => {
      const analyses = [
        { id: 'analysis1', createdAt: new Date('2023-01-01') },
        { id: 'analysis2', createdAt: new Date('2023-01-02') }
      ]
      const result = serializeAnalyses(analyses)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result[0].createdAt).toBe('2023-01-01T00:00:00.000Z')
      expect(result[1].createdAt).toBe('2023-01-02T00:00:00.000Z')
    })

    it('should handle empty array', () => {
      const result = serializeAnalyses([])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })
})
