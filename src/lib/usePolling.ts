import { useEffect, useRef, useState, useCallback } from 'react';
import { POLLING_CONFIG } from './constants';

export interface PollingOptions {
  interval: number;
  maxDuration: number;
  enabled: boolean;
  isVisible: boolean;
  onPoll: () => Promise<void>;
  onStop?: () => void;
}

export function usePolling({
  interval = POLLING_CONFIG.ANALYSIS_STATUS_INTERVAL,
  maxDuration = POLLING_CONFIG.MAX_POLLING_DURATION,
  enabled,
  isVisible,
  onPoll,
  onStop
}: PollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    startTimeRef.current = null;
    onStop?.();
  }, [onStop]);

  const startPolling = useCallback(() => {
    if (!enabled || !isVisible) return;

    stopPolling(); // Clear any existing interval
    
    startTimeRef.current = Date.now();
    setIsPolling(true);

    // Set up the polling interval
    intervalRef.current = setInterval(async () => {
      // Check if we've exceeded the maximum duration
      if (startTimeRef.current && Date.now() - startTimeRef.current > maxDuration) {
        console.log('[Polling] Max duration reached, stopping polling');
        stopPolling();
        return;
      }

      // Check if still visible and enabled
      if (!enabled || !isVisible) {
        console.log('[Polling] Conditions changed, stopping polling');
        stopPolling();
        return;
      }

      try {
        await onPoll();
      } catch (error) {
        console.error('[Polling] Error during poll:', error);
      }
    }, interval);
  }, [enabled, isVisible, interval, maxDuration, onPoll, stopPolling]);

  // Effect to handle polling state changes
  useEffect(() => {
    if (enabled && isVisible) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, isVisible, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isPolling,
    stopPolling,
    startPolling
  };
}
