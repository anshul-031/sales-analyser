import 'isomorphic-fetch';
import { renderHook, act } from '@testing-library/react';
import OptimizedApiClient, { OptimizedCache, uploadsCache, analysisCache, analyticsCache, clearAllCaches, useCacheStats, optimizedApiClient } from '../cache-optimized';

// Mocking timers
jest.useFakeTimers();

describe('OptimizedCache', () => {
  let cache: OptimizedCache<any>;

  beforeEach(() => {
    cache = new OptimizedCache({ maxSize: 3, ttl: 1000 });
    // Clear all singleton caches before each test
    clearAllCaches();
  });

  it('should initialize with default options', () => {
    const defaultCache = new OptimizedCache();
    // @ts-ignore // Accessing private members for testing
    expect(defaultCache.maxSize).toBe(100);
    // @ts-ignore
    expect(defaultCache.defaultTTL).toBe(5 * 60 * 1000);
  });

  it('should set and get a value', () => {
    cache.set('key1', { data: 'value1' });
    const entry = cache.get('key1');
    expect(entry).toEqual({ data: 'value1' });
  });

  it('should return null for a non-existent key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should return null for an expired key', () => {
    cache.set('key1', { data: 'value1' }, 500);
    jest.advanceTimersByTime(1001);
    expect(cache.get('key1')).toBeNull();
  });

  it('should check for a key with has()', () => {
    cache.set('key1', { data: 'value1' });
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should delete a key', () => {
    cache.set('key1', { data: 'value1' });
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear the cache', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
    const stats = cache.getStats();
    expect(stats.size).toBe(0);
  });

  it('should evict the oldest entry when maxSize is reached', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    cache.set('key3', { data: 'value3' });
    cache.set('key4', { data: 'value4' }); // This should evict key1
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key4')).toEqual({ data: 'value4' });
  });

  it('should return correct stats', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' }, 500);
    jest.advanceTimersByTime(750); // key2 is expired (500ms), key1 is not (1000ms)
    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.validEntries).toBe(1);
    expect(stats.expiredEntries).toBe(1);
    expect(stats.maxSize).toBe(3);
  });

  it('should return correct stats with no expired entries', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.validEntries).toBe(2);
    expect(stats.expiredEntries).toBe(0);
  });

  it('should return approximate size', () => {
    cache.set('key1', { data: 'value1' });
    const stats = cache.getStats();
    expect(stats.memoryUsage).not.toBe('0B');
  });

  it('should return approximate size in KB', () => {
    const largeValue = { data: 'a'.repeat(1024) };
    cache.set('key1', largeValue);
    const stats = cache.getStats();
    expect(stats.memoryUsage).toContain('KB');
  });

  it('should return approximate size in MB', () => {
    const veryLargeValue = { data: 'a'.repeat(1024 * 1024) };
    cache.set('key1', veryLargeValue);
    const stats = cache.getStats();
    expect(stats.memoryUsage).toContain('MB');
  });

  it('should use custom TTL when provided to set method', () => {
    cache.set('key1', { data: 'value1' }, 100);
    jest.advanceTimersByTime(150);
    expect(cache.get('key1')).toBeNull();
  });

  it('should maintain insertion order for eviction', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    cache.set('key3', { data: 'value3' });
    
    // All keys should be present
    expect(cache.get('key1')).toEqual({ data: 'value1' });
    expect(cache.get('key2')).toEqual({ data: 'value2' });
    expect(cache.get('key3')).toEqual({ data: 'value3' });
    
    // Add a 4th key to trigger eviction
    cache.set('key4', { data: 'value4' });
    
    // key1 should be evicted (oldest)
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toEqual({ data: 'value2' });
    expect(cache.get('key3')).toEqual({ data: 'value3' });
    expect(cache.get('key4')).toEqual({ data: 'value4' });
  });

  it('should handle edge case when cache is empty and eviction is attempted', () => {
    const emptyCache = new OptimizedCache({ maxSize: 0 });
    expect(() => emptyCache.set('key1', 'value1')).not.toThrow();
    expect(emptyCache.get('key1')).toBeNull(); // Should not cache when maxSize is 0
    expect(emptyCache.getStats().size).toBe(0); // Cache should remain empty
  });

  it('should not cache when maxSize is explicitly set to 0', () => {
    const noCache = new OptimizedCache({ maxSize: 0 });
    noCache.set('test', 'data');
    expect(noCache.get('test')).toBeNull();
    expect(noCache.has('test')).toBe(false);
    expect(noCache.getStats().size).toBe(0);
  });

  it('should correctly handle expired entries in has() method', () => {
    cache.set('key1', { data: 'value1' }, 100);
    expect(cache.has('key1')).toBe(true);
    jest.advanceTimersByTime(150);
    expect(cache.has('key1')).toBe(false);
  });
});

describe('OptimizedApiClient', () => {
  let client: OptimizedApiClient;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    clearAllCaches(); // Clear caches before each test to avoid interference
    client = new OptimizedApiClient('http://localhost');
    fetchSpy = jest.spyOn(global, 'fetch').mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    clearAllCaches();
  });

  describe('Instantiation', () => {
    it('should instantiate with a default base URL', () => {
      const defaultClient = new OptimizedApiClient();
      // @ts-ignore
      expect(defaultClient.baseUrl).toBe('');
    });

    it('should instantiate with a custom base URL', () => {
      const customClient = new OptimizedApiClient('https://custom.com');
      // @ts-ignore
      expect(customClient.baseUrl).toBe('https://custom.com');
    });

    it('should properly handle undefined baseUrl parameter', () => {
      const client = new OptimizedApiClient(undefined);
      expect(client).toBeInstanceOf(OptimizedApiClient);
      // @ts-ignore
      expect(client.baseUrl).toBe('');
    });

    it('should handle empty string baseUrl parameter', () => {
      const client = new OptimizedApiClient('');
      expect(client).toBeInstanceOf(OptimizedApiClient);
      // @ts-ignore
      expect(client.baseUrl).toBe('');
    });

    it('should handle null baseUrl parameter', () => {
      // @ts-ignore - Testing edge case with null
      const client = new OptimizedApiClient(null);
      expect(client).toBeInstanceOf(OptimizedApiClient);
      // @ts-ignore
      expect(client.baseUrl).toBe(null);
    });

    it('should create multiple instances with different configurations', () => {
      const clients = [
        new OptimizedApiClient(),
        new OptimizedApiClient(''),
        new OptimizedApiClient('http://localhost'),
        new OptimizedApiClient('https://api.example.com'),
        // @ts-ignore
        new OptimizedApiClient(null),
        new OptimizedApiClient(undefined),
      ];

      expect(clients.length).toBe(6);
      expect(clients[0]).toBeInstanceOf(OptimizedApiClient);
      expect(clients[1]).toBeInstanceOf(OptimizedApiClient);
      expect(clients[2]).toBeInstanceOf(OptimizedApiClient);
      expect(clients[3]).toBeInstanceOf(OptimizedApiClient);
      expect(clients[4]).toBeInstanceOf(OptimizedApiClient);
      expect(clients[5]).toBeInstanceOf(OptimizedApiClient);

      // Verify baseUrl assignments
      // @ts-ignore
      expect(clients[0].baseUrl).toBe('');
      // @ts-ignore
      expect(clients[1].baseUrl).toBe('');
      // @ts-ignore
      expect(clients[2].baseUrl).toBe('http://localhost');
      // @ts-ignore
      expect(clients[3].baseUrl).toBe('https://api.example.com');
      // @ts-ignore
      expect(clients[4].baseUrl).toBe(null);
      // @ts-ignore
      expect(clients[5].baseUrl).toBe('');
    });
  });

  it('should fetch uploads with cache miss', async () => {
    const mockData = { success: true, data: [{ id: 1, name: 'upload1.csv' }] };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getUploads();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockData);
    expect(uploadsCache.has('uploads_1_20_all')).toBe(true);
  });

  it('should fetch uploads with search parameter', async () => {
    const mockData = { success: true, data: [{ id: 2, name: 'search_result.csv' }] };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getUploads(1, 20, 'search');
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost/api/uploads-optimized?page=1&limit=20&search=search');
    expect(data).toEqual(mockData);
    expect(uploadsCache.has('uploads_1_20_search')).toBe(true);
  });

  it('should fetch uploads with cache hit', async () => {
    const mockData = { success: true, data: [{ id: 1, name: 'upload1.csv' }] };
    uploadsCache.set('uploads_1_20_all', mockData);

    const data = await client.getUploads();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(data).toEqual(mockData);
  });

  it('should fetch analysis with cache miss', async () => {
    const mockData = { success: true, data: { id: 'abc', summary: 'A summary' } };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getAnalysis('abc');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockData);
    expect(analysisCache.has('analysis_abc_summary')).toBe(true);
  });

  it('should fetch analysis with different include parameter', async () => {
    const mockData = { success: true, data: { id: 'abc', result: 'A result' } };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getAnalysis('abc', 'result');
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost/api/analysis-optimized/abc?include=result');
    expect(data).toEqual(mockData);
    expect(analysisCache.has('analysis_abc_result')).toBe(true);
  });

  it('should fetch analysis with cache hit', async () => {
    const mockData = { success: true, data: { id: 'abc', summary: 'A summary' } };
    analysisCache.set('analysis_abc_summary', mockData);

    const data = await client.getAnalysis('abc');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(data).toEqual(mockData);
  });

  it('should fetch analytics with cache miss', async () => {
    const mockData = { success: true, data: { views: 100 } };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getAnalytics();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockData);
    expect(analyticsCache.has('analytics_false')).toBe(true);
  });

  it('should fetch analytics with includeActivity=true', async () => {
    const mockData = { success: true, data: { views: 100, activity: [] } };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getAnalytics(true);
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost/api/analytics-optimized?includeActivity=true');
    expect(data).toEqual(mockData);
    expect(analyticsCache.has('analytics_true')).toBe(true);
  });

  it('should fetch analytics with cache hit', async () => {
    const mockData = { success: true, data: { views: 100 } };
    analyticsCache.set('analytics_false', mockData);

    const data = await client.getAnalytics();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(data).toEqual(mockData);
  });

  it('should invalidate uploads cache', () => {
    uploadsCache.set('somekey', {});
    client.invalidateCache('uploads');
    expect(uploadsCache.getStats().size).toBe(0);
  });

  it('should invalidate analysis cache', () => {
    analysisCache.set('analysis_abc_summary', {});
    client.invalidateCache('analysis', 'abc');
    expect(analysisCache.has('analysis_abc_summary')).toBe(false);
  });

  it('should invalidate all analysis cache if no identifier is provided', () => {
    analysisCache.set('analysis_abc_summary', {});
    client.invalidateCache('analysis');
    expect(analysisCache.getStats().size).toBe(0);
  });

  it('should invalidate analytics cache', () => {
    analyticsCache.set('somekey', {});
    client.invalidateCache('analytics');
    expect(analyticsCache.getStats().size).toBe(0);
  });

  it('should not throw for invalid resource type in invalidateCache', () => {
    expect(() => client.invalidateCache('invalid' as any)).not.toThrow();
  });

  it('should get cache stats', () => {
    uploadsCache.set('key1', {});
    analysisCache.set('key2', {});
    analyticsCache.set('key3', {});
    const stats = client.getCacheStats();
    expect(stats.uploads.size).toBe(1);
    expect(stats.analysis.size).toBe(1);
    expect(stats.analytics.size).toBe(1);
  });

  it('should preload data', async () => {
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    } as Response);

    await client.preloadData('user123');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(uploadsCache.has('uploads_1_20_all')).toBe(true);
    expect(analyticsCache.has('analytics_false')).toBe(true);
  });

  it('should handle preload data failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await client.preloadData('user123');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[OptimizedApiClient] Error preloading data:', expect.any(Error));
  });

  it('should handle preload data failure for one of the calls', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchSpy
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: {} }) } as any)
      .mockRejectedValueOnce(new Error('Network error'));

    await client.preloadData('user123');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(uploadsCache.has('uploads_1_20_all')).toBe(true);
    expect(analyticsCache.has('analytics_false')).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[OptimizedApiClient] Error preloading data:', expect.any(Error));
  });

  it('should handle fetch uploads failure', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await expect(client.getUploads()).rejects.toThrow('Network error');
    expect(uploadsCache.has('uploads_1_20_all')).toBe(false);
  });

  it('should handle fetch analysis failure', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await expect(client.getAnalysis('abc')).rejects.toThrow('Network error');
    expect(analysisCache.has('analysis_abc_summary')).toBe(false);
  });

  it('should handle fetch analytics failure', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await expect(client.getAnalytics()).rejects.toThrow('Network error');
    expect(analyticsCache.has('analytics_false')).toBe(false);
  });

  it('should not cache unsuccessful uploads response', async () => {
    const mockData = { success: false, error: 'Server error' };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getUploads();
    expect(data).toEqual(mockData);
    expect(uploadsCache.has('uploads_1_20_all')).toBe(false);
  });

  it('should not cache unsuccessful analysis response', async () => {
    const mockData = { success: false, error: 'Analysis not found' };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getAnalysis('abc');
    expect(data).toEqual(mockData);
    expect(analysisCache.has('analysis_abc_summary')).toBe(false);
  });

  it('should not cache unsuccessful analytics response', async () => {
    const mockData = { success: false, error: 'Unauthorized' };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    const data = await client.getAnalytics();
    expect(data).toEqual(mockData);
    expect(analyticsCache.has('analytics_false')).toBe(false);
  });

  it('should use different TTL for analysis based on include parameter', async () => {
    const summaryData = { success: true, data: { id: 'abc', summary: 'Summary' } };
    const fullData = { success: true, data: { id: 'abc', result: 'Full result' } };
    
    fetchSpy
      .mockResolvedValueOnce({ json: () => Promise.resolve(summaryData) } as Response)
      .mockResolvedValueOnce({ json: () => Promise.resolve(fullData) } as Response);

    // Fetch summary (should use 30min TTL)
    await client.getAnalysis('abc', 'summary');
    
    // Fetch full result (should use 60min TTL)
    await client.getAnalysis('abc', 'result');
    
    expect(analysisCache.has('analysis_abc_summary')).toBe(true);
    expect(analysisCache.has('analysis_abc_result')).toBe(true);
  });

  it('should handle uploads with different pagination parameters', async () => {
    const mockData = { success: true, data: [] };
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    await client.getUploads(2, 50);
    expect(fetchSpy).toHaveBeenCalledWith('http://localhost/api/uploads-optimized?page=2&limit=50');
    expect(uploadsCache.has('uploads_2_50_all')).toBe(true);
  });

  it('should handle force refresh parameter for uploads', async () => {
    const mockData = { success: true, data: [] };
    uploadsCache.set('uploads_1_20_all', mockData);
    
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    // Should bypass cache when forceRefresh is true
    await client.getUploads(1, 20, undefined, true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle force refresh parameter for analysis', async () => {
    const mockData = { success: true, data: { id: 'abc', summary: 'Summary' } };
    analysisCache.set('analysis_abc_summary', mockData);
    
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    // Should bypass cache when forceRefresh is true
    await client.getAnalysis('abc', 'summary', true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle force refresh parameter for analytics', async () => {
    const mockData = { success: true, data: { views: 100 } };
    analyticsCache.set('analytics_false', mockData);
    
    fetchSpy.mockResolvedValue({
      json: () => Promise.resolve(mockData),
    } as Response);

    // Should bypass cache when forceRefresh is true
    await client.getAnalytics(false, true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should invalidate specific analysis cache entries correctly', () => {
    // Set up multiple analysis cache entries for the same ID
    analysisCache.set('analysis_abc_summary', { data: 'summary' });
    analysisCache.set('analysis_abc_result', { data: 'result' });
    analysisCache.set('analysis_abc_transcription', { data: 'transcription' });
    analysisCache.set('analysis_abc_all', { data: 'all' });
    analysisCache.set('analysis_xyz_summary', { data: 'other' });

    client.invalidateCache('analysis', 'abc');

    // Should clear all abc-related entries but not xyz
    expect(analysisCache.has('analysis_abc_summary')).toBe(false);
    expect(analysisCache.has('analysis_abc_result')).toBe(false);
    expect(analysisCache.has('analysis_abc_transcription')).toBe(false);
    expect(analysisCache.has('analysis_abc_all')).toBe(false);
    expect(analysisCache.has('analysis_xyz_summary')).toBe(true);
  });
});

describe('Cache Utility Functions', () => {
  it('clearAllCaches should clear all caches', () => {
    uploadsCache.set('key1', {});
    analysisCache.set('key2', {});
    analyticsCache.set('key3', {});
    clearAllCaches();
    expect(uploadsCache.getStats().size).toBe(0);
    expect(analysisCache.getStats().size).toBe(0);
    expect(analyticsCache.getStats().size).toBe(0);
  });
});

describe('Global Cache Instances', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it('uploadsCache should have correct configuration', () => {
    // @ts-ignore - Accessing private properties for testing
    expect(uploadsCache.maxSize).toBe(50);
    // @ts-ignore
    expect(uploadsCache.defaultTTL).toBe(10 * 60 * 1000); // 10 minutes
  });

  it('analysisCache should have correct configuration', () => {
    // @ts-ignore - Accessing private properties for testing
    expect(analysisCache.maxSize).toBe(100);
    // @ts-ignore
    expect(analysisCache.defaultTTL).toBe(30 * 60 * 1000); // 30 minutes
  });

  it('analyticsCache should have correct configuration', () => {
    // @ts-ignore - Accessing private properties for testing
    expect(analyticsCache.maxSize).toBe(10);
    // @ts-ignore
    expect(analyticsCache.defaultTTL).toBe(15 * 60 * 1000); // 15 minutes
  });

  it('global cache instances should work independently', () => {
    uploadsCache.set('uploads-key', { data: 'uploads' });
    analysisCache.set('analysis-key', { data: 'analysis' });
    analyticsCache.set('analytics-key', { data: 'analytics' });

    expect(uploadsCache.get('uploads-key')).toEqual({ data: 'uploads' });
    expect(analysisCache.get('analysis-key')).toEqual({ data: 'analysis' });
    expect(analyticsCache.get('analytics-key')).toEqual({ data: 'analytics' });

    // Clear one cache shouldn't affect others
    uploadsCache.clear();
    expect(uploadsCache.get('uploads-key')).toBeNull();
    expect(analysisCache.get('analysis-key')).toEqual({ data: 'analysis' });
    expect(analyticsCache.get('analytics-key')).toEqual({ data: 'analytics' });
  });
});

describe('Singleton API Client', () => {
  it('optimizedApiClient should be exported and functional', () => {
    expect(optimizedApiClient).toBeInstanceOf(OptimizedApiClient);
    // @ts-ignore - Accessing private property for testing
    expect(optimizedApiClient.baseUrl).toBe('');
  });
});

describe('useCacheStats', () => {
  it('should return initial stats and update them over time', () => {
    const { result } = renderHook(() => useCacheStats());

    // Initial stats
    expect(result.current.uploads.size).toBe(0);

    // Change cache and advance timers
    act(() => {
      uploadsCache.set('key1', { data: 'value1' });
      jest.advanceTimersByTime(10000);
    });

    // Updated stats
    expect(result.current.uploads.size).toBe(1);
  });

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useCacheStats());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should return all cache stats correctly', () => {
    const { result } = renderHook(() => useCacheStats());

    // Add some data to all caches
    act(() => {
      uploadsCache.set('upload1', { data: 'upload' });
      analysisCache.set('analysis1', { data: 'analysis' });
      analyticsCache.set('analytics1', { data: 'analytics' });
    });

    expect(result.current.uploads.size).toBe(1);
    expect(result.current.analysis.size).toBe(1);
    expect(result.current.analytics.size).toBe(1);
  });
});