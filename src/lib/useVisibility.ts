import { useEffect, useState, useRef } from 'react';
import { POLLING_CONFIG } from './constants';

export function useVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityCheckRef = useRef<number>(0);

  // Enhanced function to check if element is in viewport with partial visibility
  const checkElementVisibility = () => {
    if (!elementRef.current) return false;

    const rect = elementRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    
    // Check if element is partially visible (more lenient than before)
    const isPartiallyVisible = (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewportHeight &&
      rect.left < viewportWidth
    );

    // Additionally check if at least 30% of the element is visible
    const elementHeight = rect.height;
    const elementWidth = rect.width;
    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    
    const visibleArea = Math.max(0, visibleHeight) * Math.max(0, visibleWidth);
    const totalArea = elementHeight * elementWidth;
    const visibilityRatio = totalArea > 0 ? visibleArea / totalArea : 0;

    // Element is considered visible if it's partially visible and at least 30% is shown
    return isPartiallyVisible && visibilityRatio >= 0.3;
  };

  // Optimized debounced visibility check with rate limiting
  const debouncedVisibilityCheck = () => {
    const now = Date.now();
    
    // Rate limiting: don't check visibility more than once per second
    if (now - lastVisibilityCheckRef.current < 1000) {
      return;
    }
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const elementVisible = checkElementVisibility();
      const newVisibility = elementVisible && isDocumentVisible;
      
      // Only update if visibility actually changed
      setIsVisible(prev => {
        if (prev !== newVisibility) {
          console.log('[Visibility] Visibility changed:', prev, '->', newVisibility);
          return newVisibility;
        }
        return prev;
      });
      
      lastVisibilityCheckRef.current = now;
    }, POLLING_CONFIG.VISIBILITY_DEBOUNCE_DELAY);
  };

  // Handle document visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const documentVisible = !document.hidden;
      setIsDocumentVisible(documentVisible);
      
      // If document becomes visible, check element visibility after a short delay
      if (documentVisible) {
        setTimeout(() => {
          debouncedVisibilityCheck();
        }, 100);
      } else {
        setIsVisible(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDocumentVisible]);

  // Handle scroll and resize events with throttling
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let resizeTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        debouncedVisibilityCheck();
      }, 100); // Throttle scroll events
    };

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        debouncedVisibilityCheck();
      }, 200); // Throttle resize events
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isDocumentVisible]);

  // Initial visibility check when element ref changes
  useEffect(() => {
    if (elementRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        debouncedVisibilityCheck();
      }, 50);
    }
  }, [elementRef.current, isDocumentVisible]);

  return {
    isVisible: isVisible && isDocumentVisible,
    elementRef,
    isDocumentVisible
  };
}
