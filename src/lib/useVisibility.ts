import { useEffect, useState, useRef } from 'react';
import { POLLING_CONFIG } from './constants';

export function useVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check if element is in viewport
  const checkElementVisibility = () => {
    if (!elementRef.current) return false;

    const rect = elementRef.current.getBoundingClientRect();
    const isInViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );

    return isInViewport;
  };

  // Debounced visibility check
  const debouncedVisibilityCheck = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const elementVisible = checkElementVisibility();
      setIsVisible(elementVisible && isDocumentVisible);
    }, POLLING_CONFIG.VISIBILITY_DEBOUNCE_DELAY);
  };

  // Handle document visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const documentVisible = !document.hidden;
      setIsDocumentVisible(documentVisible);
      
      // If document becomes visible, check element visibility
      if (documentVisible) {
        debouncedVisibilityCheck();
      } else {
        setIsVisible(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDocumentVisible]);

  // Handle scroll and resize events
  useEffect(() => {
    const handleScroll = () => {
      debouncedVisibilityCheck();
    };

    const handleResize = () => {
      debouncedVisibilityCheck();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isDocumentVisible]);

  // Initial visibility check when element ref changes
  useEffect(() => {
    if (elementRef.current) {
      debouncedVisibilityCheck();
    }
  }, [elementRef.current, isDocumentVisible]);

  return {
    isVisible: isVisible && isDocumentVisible,
    elementRef,
    isDocumentVisible
  };
}
