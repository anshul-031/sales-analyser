import { FILE_UPLOAD_CONFIG } from '../constants'

describe('Constants', () => {
  describe('FILE_UPLOAD_CONFIG', () => {
    it('should have defined MAX_FILE_SIZE', () => {
      expect(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE).toBeDefined()
      expect(typeof FILE_UPLOAD_CONFIG.MAX_FILE_SIZE).toBe('number')
      expect(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE).toBeGreaterThan(0)
    })

    it('should have reasonable max file size (200MB)', () => {
      const expectedSize = 200 * 1024 * 1024 // 200MB in bytes
      expect(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE).toBe(expectedSize)
    })

    it('should have defined MAX_FILES', () => {
      expect(FILE_UPLOAD_CONFIG.MAX_FILES).toBeDefined()
      expect(typeof FILE_UPLOAD_CONFIG.MAX_FILES).toBe('number')
      expect(FILE_UPLOAD_CONFIG.MAX_FILES).toBeGreaterThan(0)
    })

    it('should have defined CHUNK_SIZE', () => {
      expect(FILE_UPLOAD_CONFIG.CHUNK_SIZE).toBeDefined()
      expect(typeof FILE_UPLOAD_CONFIG.CHUNK_SIZE).toBe('number')
      expect(FILE_UPLOAD_CONFIG.CHUNK_SIZE).toBeGreaterThan(0)
    })

    it('should have defined ALLOWED_MIME_TYPES', () => {
      expect(FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES).toBeDefined()
      expect(Array.isArray(FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES)).toBe(true)
      expect(FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.length).toBeGreaterThan(0)
    })

    it('should include common audio mime types', () => {
      expect(FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES).toContain('audio/mpeg')
      expect(FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES).toContain('audio/wav')
    })
  })
})
