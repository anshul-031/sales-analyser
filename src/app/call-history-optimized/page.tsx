'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileAudio,
  Trash2,
  Download,
  FileText,
  BarChart3,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageCircle,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Zap,
  Database
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Logger,
  isAnalysisCompleted,
  isAnalysisFailed,
  isAnalysisProcessing 
} from '@/lib/utils';
import AnalysisDisplay from '@/components/AnalysisDisplay';
import Chatbot from '@/components/Chatbot';
import { optimizedApiClient, useCacheStats } from '@/lib/cache-optimized';

import type { 
  CallRecording, 
  AnalysisResultData, 
} from '@/types';

// Optimized call history page with bandwidth optimization features
export default function OptimizedCallHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const cacheStats = useCacheStats();
  
  // State management
  const [callRecordings, setCallRecordings] = useState<CallRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analysis');
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  
  // Pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize] = useState(10); // Smaller page size for better performance
  
  // Loading states for different operations
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingTranscription, setLoadingTranscription] = useState(false);
  
  // Bandwidth optimization settings
  const [bandwidthMode, setBandwidthMode] = useState<'minimal' | 'balanced' | 'full'>('balanced');
  const [preloadEnabled, setPreloadEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      loadCallRecordings();
      
      // Preload data if enabled
      if (preloadEnabled) {
        optimizedApiClient.preloadData(user.id);
      }
    }
  }, [user, authLoading, currentPage, searchQuery, preloadEnabled]);

  const loadCallRecordings = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('[OptimizedCallHistory] Loading recordings with pagination...');
      setLoading(true);
      
      const result = await optimizedApiClient.getUploads(
        currentPage,
        pageSize,
        searchQuery || undefined
      );
      
      if (result.success) {
        const audioFiles = result.uploads.filter((file: any) => 
          file.mimeType?.startsWith('audio/') || 
          file.originalName?.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)
        );
        
        setCallRecordings(audioFiles);
        setTotalPages(result.pagination?.totalPages || 1);
        
        // Auto-select first recording if none selected and we're on page 1
        if (audioFiles.length > 0 && !selectedRecording && currentPage === 1) {
          setSelectedRecording(audioFiles[0]);
        }
        
        console.log(`[OptimizedCallHistory] Loaded ${audioFiles.length} recordings (page ${currentPage}/${result.pagination?.totalPages})`);
      } else {
        console.error('[OptimizedCallHistory] Failed to load recordings:', result.error);
      }
    } catch (error) {
      console.error('[OptimizedCallHistory] Error loading recordings:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, pageSize, searchQuery, selectedRecording]);

  const handleRecordingSelect = useCallback(async (recording: CallRecording) => {
    console.log('[OptimizedCallHistory] Selecting recording:', recording.id);
    setSelectedRecording(recording);
    setSelectedAnalysis(null);
    setActiveTab('analysis');
    
    // Load analysis summary immediately if available
    if (recording.latestAnalysis?.id) {
      await loadAnalysisSummary(recording.latestAnalysis.id);
    }
  }, []);

  const loadAnalysisSummary = useCallback(async (analysisId: string) => {
    try {
      setLoadingAnalysis(true);
      const result = await optimizedApiClient.getAnalysis(analysisId, 'summary');
      
      if (result.success) {
        setSelectedAnalysis(result.analysis);
        console.log('[OptimizedCallHistory] Loaded analysis summary');
      }
    } catch (error) {
      console.error('[OptimizedCallHistory] Error loading analysis summary:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const loadAnalysisResult = useCallback(async (analysisId: string) => {
    try {
      setLoadingAnalysis(true);
      const result = await optimizedApiClient.getAnalysis(analysisId, 'result');
      
      if (result.success) {
        setSelectedAnalysis(result.analysis);
        console.log('[OptimizedCallHistory] Loaded analysis result');
      }
    } catch (error) {
      console.error('[OptimizedCallHistory] Error loading analysis result:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const loadTranscription = useCallback(async (analysisId: string) => {
    try {
      setLoadingTranscription(true);
      const result = await optimizedApiClient.getAnalysis(analysisId, 'transcription');
      
      if (result.success) {
        setSelectedAnalysis(result.analysis);
        console.log('[OptimizedCallHistory] Loaded transcription');
      }
    } catch (error) {
      console.error('[OptimizedCallHistory] Error loading transcription:', error);
    } finally {
      setLoadingTranscription(false);
    }
  }, []);

  const handleDelete = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording and its analysis?')) return;

    try {
      const response = await fetch(`/api/upload?id=${recordingId}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        // Invalidate cache and reload
        optimizedApiClient.invalidateCache('uploads');
        optimizedApiClient.invalidateCache('analytics');
        await loadCallRecordings();
        
        if (selectedRecording?.id === recordingId) {
          setSelectedRecording(null);
          setSelectedAnalysis(null);
        }
      } else {
        console.error('Delete failed:', result.error);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const refreshData = useCallback(async () => {
    optimizedApiClient.invalidateCache('uploads');
    await loadCallRecordings();
  }, [loadCallRecordings]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading call history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with bandwidth optimization controls */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Call History (Optimized)</h1>
              <p className="text-sm text-gray-600 mt-1">
                Bandwidth optimized • {callRecordings.length} recordings loaded
              </p>
            </div>
            
            {/* Bandwidth optimization controls */}
            <div className="flex items-center gap-4">
              {/* Cache stats */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                <Database className="w-4 h-4" />
                <span>Cache: {cacheStats.uploads.validEntries + cacheStats.analysis.validEntries} items</span>
              </div>
              
              {/* Bandwidth mode selector */}
              <select
                value={bandwidthMode}
                onChange={(e) => setBandwidthMode(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="minimal">Minimal Bandwidth</option>
                <option value="balanced">Balanced</option>
                <option value="full">Full Data</option>
              </select>
              
              {/* Refresh button */}
              <button
                onClick={refreshData}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="mt-4 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recordings List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Recordings</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Zap className="w-4 h-4" />
                  <span>Optimized</span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {callRecordings.map((recording) => (
                  <div
                    key={recording.id}
                    onClick={() => handleRecordingSelect(recording)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedRecording?.id === recording.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileAudio className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {recording.originalName}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {new Date(recording.uploadedAt).toLocaleDateString()}
                            </span>
                            {recording.latestAnalysis && (
                              <div className="flex items-center gap-1">
                                {isAnalysisCompleted(recording.latestAnalysis.status) && (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                )}
                                {isAnalysisFailed(recording.latestAnalysis.status) && (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                                {isAnalysisProcessing(recording.latestAnalysis.status) && (
                                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                )}
                                <span className="text-xs text-gray-500">
                                  {recording.latestAnalysis.status.toLowerCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(recording.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 rounded hover:bg-gray-100"
                        title="Delete recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t flex justify-between items-center">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Display */}
          <div className="lg:col-span-2">
            {selectedRecording ? (
              <div className="bg-white rounded-xl shadow-sm border">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'analysis'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Analysis
                        {loadingAnalysis && <Loader2 className="w-3 h-3 animate-spin" />}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('transcription');
                        if (selectedRecording.latestAnalysis?.id && !loadingTranscription) {
                          loadTranscription(selectedRecording.latestAnalysis.id);
                        }
                      }}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'transcription'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Transcription
                        {loadingTranscription && <Loader2 className="w-3 h-3 animate-spin" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {activeTab === 'analysis' && (
                    <div>
                      {selectedAnalysis?.analysisResult ? (
                        <AnalysisDisplay analysisResult={selectedAnalysis.analysisResult} />
                      ) : isAnalysisCompleted(selectedRecording.latestAnalysis?.status) ? (
                        <div className="text-center py-8">
                          <button
                            onClick={() => loadAnalysisResult(selectedRecording.latestAnalysis!.id)}
                            disabled={loadingAnalysis}
                            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {loadingAnalysis ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading Analysis...
                              </>
                            ) : (
                              <>
                                <BarChart3 className="w-4 h-4" />
                                Load Analysis Results
                              </>
                            )}
                          </button>
                          <p className="text-sm text-gray-500 mt-2">
                            Click to load full analysis results (~{bandwidthMode === 'minimal' ? '10KB' : '50KB'})
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-700 mb-2">No Analysis Available</h3>
                          <p>Analysis not completed or failed for this recording.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'transcription' && (
                    <div>
                      {selectedAnalysis?.transcription ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium text-gray-900 mb-3">Transcription</h3>
                          <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                            {selectedAnalysis.transcription}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <h3 className="text-lg font-medium text-gray-700 mb-2">No Transcription Available</h3>
                          <p>Transcription not available for this recording.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <FileAudio className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Select a Recording</h3>
                <p className="text-gray-500">Choose a recording from the list to view its analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
