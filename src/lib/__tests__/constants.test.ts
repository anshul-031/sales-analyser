import {
  FILE_UPLOAD_CONFIG,
  USER_CONFIG,
  API_CONFIG,
  POLLING_CONFIG,
  DATABASE_CONFIG,
  MAX_FILE_SIZE,
  MAX_FILES,
  CHUNK_SIZE,
  CONNECTION_TIMEOUT,
  QUERY_TIMEOUT,
  MAX_RETRIES
} from '../constants'

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

    it('should contain all supported file extensions', () => {
      const expectedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm'];
      expect(FILE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS).toEqual(expectedExtensions);
      expect(FILE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS).toHaveLength(7);
    });
  })

  describe('USER_CONFIG', () => {
    it('should have demo user ID', () => {
      expect(USER_CONFIG.DEMO_USER_ID).toBe('demo-user-001');
      expect(typeof USER_CONFIG.DEMO_USER_ID).toBe('string');
    });
  });

  describe('API_CONFIG', () => {
    it('should have all required API endpoints', () => {
      expect(API_CONFIG.ENDPOINTS.UPLOAD).toBe('/api/upload');
      expect(API_CONFIG.ENDPOINTS.ANALYZE).toBe('/api/analyze');
      expect(API_CONFIG.ENDPOINTS.CHATBOT).toBe('/api/chatbot');
      expect(API_CONFIG.ENDPOINTS.CLEANUP).toBe('/api/cleanup');
    });

    it('should have exactly 4 endpoints', () => {
      const endpointKeys = Object.keys(API_CONFIG.ENDPOINTS);
      expect(endpointKeys).toHaveLength(4);
      expect(endpointKeys).toEqual(['UPLOAD', 'ANALYZE', 'CHATBOT', 'CLEANUP']);
    });
  });

  describe('POLLING_CONFIG', () => {
    it('should have correct polling intervals', () => {
      expect(POLLING_CONFIG.ANALYSIS_STATUS_INTERVAL).toBe(120 * 1000); // 2 minutes
      expect(POLLING_CONFIG.MAX_POLLING_DURATION).toBe(30 * 60 * 1000); // 30 minutes
      expect(POLLING_CONFIG.VISIBILITY_DEBOUNCE_DELAY).toBe(500); // 500ms
    });

    it('should have reasonable time values', () => {
      expect(POLLING_CONFIG.ANALYSIS_STATUS_INTERVAL).toBeGreaterThanOrEqual(30 * 1000);
      expect(POLLING_CONFIG.MAX_POLLING_DURATION).toBeGreaterThanOrEqual(10 * 60 * 1000);
      expect(POLLING_CONFIG.VISIBILITY_DEBOUNCE_DELAY).toBeGreaterThanOrEqual(100);
    });
  });

  describe('DATABASE_CONFIG', () => {
    it('should have correct timeout values', () => {
      expect(DATABASE_CONFIG.CONNECTION_TIMEOUT).toBe(30 * 1000); // 30 seconds
      expect(DATABASE_CONFIG.QUERY_TIMEOUT).toBe(60 * 1000); // 60 seconds
    });

    it('should have correct retry configuration', () => {
      expect(DATABASE_CONFIG.MAX_RETRIES).toBe(3);
      expect(DATABASE_CONFIG.BASE_RETRY_DELAY).toBe(1000); // 1 second
      expect(DATABASE_CONFIG.MAX_RETRY_DELAY).toBe(30 * 1000); // 30 seconds
    });

    it('should have correct connection pool settings', () => {
      expect(DATABASE_CONFIG.CONNECTION_POOL.MIN).toBe(2);
      expect(DATABASE_CONFIG.CONNECTION_POOL.MAX).toBe(10);
      expect(DATABASE_CONFIG.CONNECTION_POOL.TIMEOUT).toBe(30000); // 30 seconds
      expect(DATABASE_CONFIG.CONNECTION_POOL.IDLE_TIMEOUT).toBe(10000); // 10 seconds
    });
  });

  describe('Convenience exports', () => {
    it('should re-export commonly used values', () => {
      expect(MAX_FILE_SIZE).toBe(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE);
      expect(MAX_FILES).toBe(FILE_UPLOAD_CONFIG.MAX_FILES);
      expect(CHUNK_SIZE).toBe(FILE_UPLOAD_CONFIG.CHUNK_SIZE);
      expect(CONNECTION_TIMEOUT).toBe(DATABASE_CONFIG.CONNECTION_TIMEOUT);
      expect(QUERY_TIMEOUT).toBe(DATABASE_CONFIG.QUERY_TIMEOUT);
      expect(MAX_RETRIES).toBe(DATABASE_CONFIG.MAX_RETRIES);
    });
  });
})
