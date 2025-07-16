import { renderHook, act } from '@testing-library/react';
import { useVisibility } from '../useVisibility';

// Mock getBoundingClientRect
const mockGetBoundingClientRect = jest.fn();

// Mock setTimeout and clearTimeout for debouncing
jest.useFakeTimers();

describe('useVisibility', () => {
  beforeEach(() => {
    // Mock element prototype
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: mockGetBoundingClientRect,
    });
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    
    // Reset document.hidden
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: false,
    });
    
    mockGetBoundingClientRect.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initial state and setup', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useVisibility());
      expect(result.current.isVisible).toBe(true); // Default is true, not false
      expect(result.current.isDocumentVisible).toBe(true);
      expect(result.current.elementRef.current).toBeNull();
    });

    it('should provide element ref for DOM attachment', () => {
      const { result } = renderHook(() => useVisibility());
      const element = document.createElement('div');

      act(() => {
        result.current.elementRef.current = element;
      });

      expect(result.current.elementRef.current).toBe(element);
    });
  });

  describe('Document visibility handling', () => {
    it('should update isDocumentVisible when document visibility changes', () => {
      const { result } = renderHook(() => useVisibility());

      // Simulate document becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(result.current.isDocumentVisible).toBe(false);
      expect(result.current.isVisible).toBe(false);

      // Simulate document becoming visible
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(result.current.isDocumentVisible).toBe(true);
    });
  });

  describe('Element visibility detection', () => {
    it('should detect when element is visible', () => {
      const { result } = renderHook(() => useVisibility());
      
      // Mock a visible element (inside viewport with sufficient visible area)
      mockGetBoundingClientRect.mockReturnValue({
        top: 100,
        left: 100,
        bottom: 300,
        right: 400,
        height: 200,
        width: 300,
      });

      act(() => {
        result.current.elementRef.current = document.createElement('div');
      });

      // Trigger visibility check by advancing timers (for debounce)
      act(() => {
        jest.advanceTimersByTime(350); // Past debounce delay
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should detect when element is not visible', () => {
      const { result } = renderHook(() => useVisibility());
      
      // Mock element that's outside viewport
      mockGetBoundingClientRect.mockReturnValue({
        top: 2000, // Way below viewport
        left: 100,
        bottom: 2200,
        right: 400,
        height: 200,
        width: 300,
      });

      act(() => {
        result.current.elementRef.current = document.createElement('div');
      });

      // Trigger a scroll event to force visibility check
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      // Trigger visibility check
      act(() => {
        jest.advanceTimersByTime(1350); // Wait past debounce and rate limiting
      });

      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('Cleanup and edge cases', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      const { unmount } = renderHook(() => useVisibility());
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should work with fallback dimensions when window dimensions unavailable', () => {
      // Mock missing window.innerHeight/innerWidth
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useVisibility());

      mockGetBoundingClientRect.mockReturnValue({
        top: 100,
        left: 100,
        bottom: 300,
        right: 400,
        height: 200,
        width: 300,
      });

      act(() => {
        result.current.elementRef.current = document.createElement('div');
      });

      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Should still work using documentElement dimensions
      expect(result.current.isVisible).toBe(true);
    });

    it('should handle element at viewport boundaries', () => {
      const { result } = renderHook(() => useVisibility());

      // Element exactly at bottom edge of viewport
      mockGetBoundingClientRect.mockReturnValue({
        top: 1024, // Exactly at viewport height
        left: 100,
        bottom: 1224,
        right: 400,
        height: 200,
        width: 300,
      });

      act(() => {
        result.current.elementRef.current = document.createElement('div');
      });

      // Trigger a scroll event to force visibility check
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      act(() => {
        jest.advanceTimersByTime(1350); // Wait past debounce and rate limiting
      });

      expect(result.current.isVisible).toBe(false);
    });

    it('should handle rapid element ref changes', () => {
      const { result } = renderHook(() => useVisibility());

      // Assign and reassign element ref rapidly
      act(() => {
        result.current.elementRef.current = document.createElement('div');
        result.current.elementRef.current = null;
        result.current.elementRef.current = document.createElement('div');
      });

      act(() => {
        jest.advanceTimersByTime(100); // Initial delay
      });

      // Should handle without crashing
      expect(result.current.isVisible).toBeDefined();
    });
  });

  describe('Combined visibility states', () => {
    it('should return false when element is visible but document is hidden', () => {
      const { result } = renderHook(() => useVisibility());

      // Set up visible element
      mockGetBoundingClientRect.mockReturnValue({
        top: 100,
        left: 100,
        bottom: 300,
        right: 400,
        height: 200,
        width: 300,
      });

      act(() => {
        result.current.elementRef.current = document.createElement('div');
      });

      // Hide document
      act(() => {
        Object.defineProperty(document, 'hidden', {
          writable: true,
          configurable: true,
          value: true,
        });

        const visibilityChangeEvent = new Event('visibilitychange');
        document.dispatchEvent(visibilityChangeEvent);
      });

      // Even though element would be visible, document is hidden
      expect(result.current.isVisible).toBe(false);
      expect(result.current.isDocumentVisible).toBe(false);
    });

    it('should return true only when both element and document are visible', () => {
      const { result } = renderHook(() => useVisibility());

      mockGetBoundingClientRect.mockReturnValue({
        top: 100,
        left: 100,
        bottom: 300,
        right: 400,
        height: 200,
        width: 300,
      });

      act(() => {
        result.current.elementRef.current = document.createElement('div');
      });

      act(() => {
        jest.advanceTimersByTime(350);
      });

      expect(result.current.isVisible).toBe(true);
      expect(result.current.isDocumentVisible).toBe(true);
    });
  });
});
