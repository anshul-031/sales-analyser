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

// Global state to manage polling across all instances
class GlobalPollingManager {
  private static instance: GlobalPollingManager;
  private lastGlobalPollTime = 0;
  private activePollers = new Set<string>();
  private currentlyPolling = false;
  
  // Minimum time between ANY API calls globally (1 minute)
  private readonly MIN_GLOBAL_POLL_INTERVAL = 60000; // 1 minute

  static getInstance(): GlobalPollingManager {
    if (!GlobalPollingManager.instance) {
      GlobalPollingManager.instance = new GlobalPollingManager();
    }
    return GlobalPollingManager.instance;
  }

  registerPoller(pollerId: string): void {
    this.activePollers.add(pollerId);
    console.log(`[GlobalPolling] Registered poller ${pollerId}, total active: ${this.activePollers.size}`);
  }

  unregisterPoller(pollerId: string): void {
    this.activePollers.delete(pollerId);
    console.log(`[GlobalPolling] Unregistered poller ${pollerId}, total active: ${this.activePollers.size}`);
  }

  async canPoll(pollerId: string): Promise<boolean> {
    const now = Date.now();
    const timeSinceLastPoll = now - this.lastGlobalPollTime;
    
    if (this.currentlyPolling) {
      console.log(`[GlobalPolling] ${pollerId} - Already polling in progress, skipping`);
      return false;
    }
    
    if (timeSinceLastPoll < this.MIN_GLOBAL_POLL_INTERVAL) {
      const waitTime = Math.ceil((this.MIN_GLOBAL_POLL_INTERVAL - timeSinceLastPoll) / 1000);
      console.log(`[GlobalPolling] ${pollerId} - Rate limited, need to wait ${waitTime}s more`);
      return false;
    }

    return true;
  }

  async executePoll(pollerId: string, pollFn: () => Promise<void>): Promise<void> {
    if (!await this.canPoll(pollerId)) {
      return;
    }

    try {
      this.currentlyPolling = true;
      this.lastGlobalPollTime = Date.now();
      console.log(`[GlobalPolling] ${pollerId} - Executing poll (${this.activePollers.size} active pollers)`);
      
      await pollFn();
      
      console.log(`[GlobalPolling] ${pollerId} - Poll completed successfully`);
    } catch (error) {
      console.error(`[GlobalPolling] ${pollerId} - Poll failed:`, error);
    } finally {
      this.currentlyPolling = false;
    }
  }

  getStats() {
    return {
      activePollers: this.activePollers.size,
      lastPollTime: this.lastGlobalPollTime,
      currentlyPolling: this.currentlyPolling,
      timeSinceLastPoll: Date.now() - this.lastGlobalPollTime
    };
  }
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
  const pollCountRef = useRef<number>(0);
  const pollerIdRef = useRef<string>(`poller-${Math.random().toString(36).substr(2, 9)}`);
  const [isPolling, setIsPolling] = useState(false);

  const globalManager = GlobalPollingManager.getInstance();

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    startTimeRef.current = null;
    pollCountRef.current = 0;
    console.log(`[Polling] ${pollerIdRef.current} - Stopped polling`);
    onStop?.();
  }, [onStop]);

  const executePoll = useCallback(async () => {
    // Check if still enabled and visible
    if (!enabled) {
      console.log(`[Polling] ${pollerIdRef.current} - Disabled, stopping polling`);
      stopPolling();
      return;
    }

    if (!isVisible) {
      console.log(`[Polling] ${pollerIdRef.current} - Not visible, skipping poll`);
      return;
    }

    // Use global manager to execute poll with rate limiting
    await globalManager.executePoll(pollerIdRef.current, async () => {
      await onPoll();
      pollCountRef.current++;
    });
  }, [enabled, isVisible, onPoll, stopPolling, globalManager]);

  const startPolling = useCallback(() => {
    if (!enabled || !isVisible) {
      console.log(`[Polling] ${pollerIdRef.current} - Not starting: enabled=${enabled}, visible=${isVisible}`);
      return;
    }

    stopPolling(); // Clear any existing interval
    
    startTimeRef.current = Date.now();
    setIsPolling(true);
    pollCountRef.current = 0;
    
    // Register this poller instance
    globalManager.registerPoller(pollerIdRef.current);
    
    // Use a longer interval to be more conservative (2 minutes instead of 1)
    const conservativeInterval = Math.max(interval, 120000); // 2 minutes minimum
    
    console.log(`[Polling] ${pollerIdRef.current} - Started polling with interval:`, conservativeInterval, 'ms');

    // Set up the polling interval
    intervalRef.current = setInterval(async () => {
      // Check if we've exceeded the maximum duration
      if (startTimeRef.current && Date.now() - startTimeRef.current > maxDuration) {
        console.log(`[Polling] ${pollerIdRef.current} - Max duration reached, stopping polling`);
        stopPolling();
        return;
      }

      await executePoll();
    }, conservativeInterval);

  }, [enabled, isVisible, interval, maxDuration, executePoll, stopPolling, globalManager]);

  // Effect to handle polling state changes
  useEffect(() => {
    if (enabled && isVisible) {
      if (!isPolling) {
        console.log(`[Polling] ${pollerIdRef.current} - Starting polling due to enabled and visible state`);
        startPolling();
      }
    } else if (!enabled) {
      if (isPolling) {
        console.log(`[Polling] ${pollerIdRef.current} - Stopping polling due to disabled state`);
        stopPolling();
      }
    }
    // Note: We don't stop polling immediately when not visible to avoid interruptions
    // The polling logic will handle visibility checks internally
  }, [enabled, isVisible, startPolling, stopPolling, isPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      globalManager.unregisterPoller(pollerIdRef.current);
      stopPolling();
    };
  }, [stopPolling, globalManager]);

  return {
    isPolling,
    stopPolling,
    startPolling,
    pollCount: pollCountRef.current,
    pollerId: pollerIdRef.current,
    globalStats: globalManager.getStats()
  };
}
