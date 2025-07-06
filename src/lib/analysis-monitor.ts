import { Logger } from './utils';
import { DatabaseStorage } from './db';
import { LoggingConfig } from './logging-config';

// Global analysis tracker for monitoring in-progress analyses
interface AnalysisProgress {
  id: string;
  userId: string;
  filename: string;
  startTime: number;
  stage: 'PENDING' | 'PROCESSING' | 'TRANSCRIBING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  lastUpdateTime: number;
  analysisType: string;
  requestId?: string;
}

class AnalysisMonitor {
  private static instance: AnalysisMonitor;
  private inProgressAnalyses: Map<string, AnalysisProgress> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): AnalysisMonitor {
    if (!AnalysisMonitor.instance) {
      AnalysisMonitor.instance = new AnalysisMonitor();
    }
    return AnalysisMonitor.instance;
  }

  /**
   * Start monitoring in-progress analyses
   * Logs status every minute for all ongoing analyses
   */
  startMonitoring(): void {
    if (this.isRunning) {
      Logger.warn('[Analysis Monitor] Monitoring already running');
      return;
    }

    this.isRunning = true;
    Logger.monitor('Starting periodic analysis monitoring');

    // Initial sync with database
    this.syncWithDatabase();

    // Set up periodic monitoring (every minute)
    this.monitoringInterval = setInterval(() => {
      this.logInProgressAnalyses();
      this.syncWithDatabase();
      this.cleanupStaleAnalyses();
    }, LoggingConfig.monitoring.intervalMs);

    Logger.monitor('Monitoring started successfully');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isRunning = false;
    Logger.monitor('Monitoring stopped');
  }

  /**
   * Register a new analysis for monitoring
   */
  registerAnalysis(analysis: {
    id: string;
    userId: string;
    filename: string;
    analysisType: string;
    requestId?: string;
  }): void {
    const progress: AnalysisProgress = {
      id: analysis.id,
      userId: analysis.userId,
      filename: analysis.filename,
      startTime: Date.now(),
      stage: 'PENDING',
      lastUpdateTime: Date.now(),
      analysisType: analysis.analysisType,
      requestId: analysis.requestId,
    };

    this.inProgressAnalyses.set(analysis.id, progress);
    
    Logger.monitor(`Registered analysis for monitoring:`, {
      analysisId: analysis.id,
      filename: analysis.filename,
      analysisType: analysis.analysisType,
      requestId: analysis.requestId
    });
  }

  /**
   * Update analysis stage
   */
  updateAnalysisStage(analysisId: string, stage: AnalysisProgress['stage']): void {
    const progress = this.inProgressAnalyses.get(analysisId);
    if (progress) {
      progress.stage = stage;
      progress.lastUpdateTime = Date.now();
      
      Logger.monitor(`Updated analysis stage:`, {
        analysisId,
        stage,
        filename: progress.filename,
        elapsedTime: Date.now() - progress.startTime
      });
    }
  }

  /**
   * Remove analysis from monitoring (when completed or failed)
   */
  completeAnalysis(analysisId: string, finalStage: 'COMPLETED' | 'FAILED'): void {
    const progress = this.inProgressAnalyses.get(analysisId);
    if (progress) {
      const totalTime = Date.now() - progress.startTime;
      
      Logger.monitor(`Analysis completed:`, {
        analysisId,
        filename: progress.filename,
        finalStage,
        totalTime: totalTime + 'ms',
        analysisType: progress.analysisType
      });

      // Log completion metrics
      Logger.production('info', `Analysis ${finalStage.toLowerCase()}`, {
        analysisId,
        filename: progress.filename,
        totalTime,
        finalStage,
        analysisType: progress.analysisType,
        requestId: progress.requestId
      });

      this.inProgressAnalyses.delete(analysisId);
    }
  }

  /**
   * Log status of all in-progress analyses
   */
  private logInProgressAnalyses(): void {
    const analyses = Array.from(this.inProgressAnalyses.values());
    
    if (analyses.length === 0) {
      Logger.monitor('No analyses currently in progress');
      return;
    }

    Logger.monitor(`${analyses.length} analyses in progress:`);

    analyses.forEach((analysis, index) => {
      const elapsedTime = Date.now() - analysis.startTime;
      const timeSinceUpdate = Date.now() - analysis.lastUpdateTime;
      
      Logger.monitor(`[${index + 1}/${analyses.length}] ${analysis.id}:`, {
        filename: analysis.filename,
        stage: analysis.stage,
        elapsedTime: Math.round(elapsedTime / 1000) + 's',
        timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + 's',
        analysisType: analysis.analysisType,
        userId: analysis.userId,
        requestId: analysis.requestId
      });

      // Warn about stuck analyses
      if (timeSinceUpdate > LoggingConfig.monitoring.stuckAnalysisThresholdMs) {
        Logger.warn(`[Analysis Monitor] Analysis may be stuck:`, {
          analysisId: analysis.id,
          filename: analysis.filename,
          stage: analysis.stage,
          timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + 's',
          elapsedTime: Math.round(elapsedTime / 1000) + 's'
        });
      }

      // Alert about very long running analyses
      if (elapsedTime > LoggingConfig.monitoring.longRunningAnalysisThresholdMs) {
        Logger.production('warn', `Long-running analysis detected`, {
          analysisId: analysis.id,
          filename: analysis.filename,
          stage: analysis.stage,
          elapsedTime: Math.round(elapsedTime / 1000) + 's',
          analysisType: analysis.analysisType
        });
      }
    });

    // Log summary metrics
    const stageStats = analyses.reduce((acc, analysis) => {
      acc[analysis.stage] = (acc[analysis.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Logger.monitor('Stage distribution:', stageStats);
  }

  /**
   * Sync with database to ensure accuracy
   */
  private async syncWithDatabase(): Promise<void> {
    try {
      // Get all processing analyses from database
      const processingAnalyses = await DatabaseStorage.getAnalysesByStatus('PROCESSING');
      const pendingAnalyses = await DatabaseStorage.getAnalysesByStatus('PENDING');
      
      const dbAnalyses = [...processingAnalyses, ...pendingAnalyses];
      
      // Update our in-memory tracking
      for (const dbAnalysis of dbAnalyses) {
        const existing = this.inProgressAnalyses.get(dbAnalysis.id);
        if (!existing) {
          // Analysis exists in DB but not in our tracking - add it
          this.registerAnalysis({
            id: dbAnalysis.id,
            userId: dbAnalysis.userId,
            filename: dbAnalysis.upload?.filename || 'unknown',
            analysisType: dbAnalysis.analysisType,
            requestId: 'sync'
          });
        }
      }

      // Remove completed analyses from tracking
      const dbAnalysisIds = new Set(dbAnalyses.map(a => a.id));
      for (const [analysisId] of this.inProgressAnalyses) {
        if (!dbAnalysisIds.has(analysisId)) {
          // Analysis no longer in progress - remove from tracking
          this.inProgressAnalyses.delete(analysisId);
        }
      }

    } catch (error) {
      Logger.error('[Analysis Monitor] Error syncing with database:', error);
    }
  }

  /**
   * Clean up stale analyses that haven't been updated in a while
   */
  private cleanupStaleAnalyses(): void {
    const staleThreshold = LoggingConfig.monitoring.staleAnalysisThresholdMs;
    const now = Date.now();
    
    for (const [analysisId, progress] of this.inProgressAnalyses) {
      if (now - progress.lastUpdateTime > staleThreshold) {
        Logger.warn(`[Analysis Monitor] Removing stale analysis from tracking:`, {
          analysisId,
          filename: progress.filename,
          stage: progress.stage,
          staleTime: Math.round((now - progress.lastUpdateTime) / 1000) + 's'
        });
        
        this.inProgressAnalyses.delete(analysisId);
      }
    }
  }

  /**
   * Get current monitoring stats
   */
  getMonitoringStats(): {
    totalInProgress: number;
    byStage: Record<string, number>;
    longestRunning: { id: string; filename: string; elapsedTime: number } | null;
  } {
    const analyses = Array.from(this.inProgressAnalyses.values());
    
    const byStage = analyses.reduce((acc, analysis) => {
      acc[analysis.stage] = (acc[analysis.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const longestRunning = analyses.reduce((longest, analysis) => {
      const elapsedTime = Date.now() - analysis.startTime;
      if (!longest || elapsedTime > longest.elapsedTime) {
        return { id: analysis.id, filename: analysis.filename, elapsedTime };
      }
      return longest;
    }, null as { id: string; filename: string; elapsedTime: number } | null);

    return {
      totalInProgress: analyses.length,
      byStage,
      longestRunning
    };
  }
}

// Export singleton instance
export const analysisMonitor = AnalysisMonitor.getInstance();

// Auto-start monitoring in all environments for comprehensive tracking
if (typeof process !== 'undefined') {
  analysisMonitor.startMonitoring();
}
