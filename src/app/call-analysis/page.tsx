'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Search, 
  Filter, 
  MessageSquare, 
  BarChart3,
  FileAudio,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { 
  Logger,
  isAnalysisCompleted,
  isAnalysisFailed 
} from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

import type { 
  AnalysisUIResult, 
  CallRecording, 
  TimeFilter, 
  AnalysisStatus 
} from '@/types';

const TIME_FILTERS: TimeFilter[] = [
  { label: 'Past 24 Hours', value: '24h', days: 1 },
  { label: 'Past 7 Days', value: '7d', days: 7 },
  { label: 'Past Month', value: '30d', days: 30 },
  { label: 'Past 3 Months', value: '90d', days: 90 },
  { label: 'Past Year', value: '365d', days: 365 },
  { label: 'All Time', value: 'all', days: -1 }
];

export default function CallAnalysisPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [callRecordings, setCallRecordings] = useState<CallRecording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<CallRecording[]>([]);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<string>>(new Set());
  const [timeFilter, setTimeFilter] = useState<string>('all'); // Changed from '7d' to 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisUIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingCustom, setAnalyzingCustom] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      loadCallRecordings();
    }
  }, [user, authLoading]);

  useEffect(() => {
    filterRecordings();
  }, [callRecordings, timeFilter, searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + A to select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && !event.shiftKey) {
        event.preventDefault();
        if (filteredRecordings.length > 0) {
          handleSelectAll();
        }
      }
      // Escape to clear selection
      if (event.key === 'Escape') {
        setSelectedRecordings(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredRecordings]);

  const loadCallRecordings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      Logger.info('[CallAnalysis] Loading call recordings for user:', user.id);
      
      const response = await fetch('/api/upload?optimized=true');
      const result = await response.json();
      
      if (result.success) {
        // Filter only audio files
        const audioFiles = result.uploads?.filter((file: any) => 
          file.mimeType?.startsWith('audio/') || 
          file.originalName?.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)
        ) || [];

        // Debug: Log the structure of the first audio file to understand the date format
        if (audioFiles.length > 0) {
          console.log('[DEBUG] First audio file structure:', audioFiles[0]);
          console.log('[DEBUG] uploadedAt field:', audioFiles[0].uploadedAt);
          console.log('[DEBUG] uploadedAt type:', typeof audioFiles[0].uploadedAt);
          console.log('[DEBUG] uploadedAt JSON:', JSON.stringify(audioFiles[0].uploadedAt));
        }

        // The upload API already includes analysis data
        setCallRecordings(audioFiles);
        Logger.info('[CallAnalysis] Loaded', audioFiles.length, 'call recordings');
      } else {
        console.error('[CallAnalysis] Failed to load recordings:', result.error);
      }
    } catch (error) {
      console.error('[CallAnalysis] Error loading recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecordings = () => {
    let filtered = [...callRecordings];

    // Apply time filter
    if (timeFilter !== 'all') {
      const filterDays = TIME_FILTERS.find(f => f.value === timeFilter)?.days || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filterDays);

      filtered = filtered.filter(recording => {
        try {
          const uploadedAt = recording.uploadedAt;
          let recordingDate: Date;
          
          // Convert to Date, handling various formats
          if (typeof uploadedAt === 'string') {
            recordingDate = new Date(uploadedAt);
          } else if (uploadedAt && typeof uploadedAt === 'object') {
            // Handle serialized date objects by converting to string first
            recordingDate = new Date((uploadedAt as any).toString());
          } else {
            recordingDate = new Date(uploadedAt);
          }
          
          // Check if the date is valid
          if (isNaN(recordingDate.getTime())) {
            console.warn('Invalid date for recording:', recording.originalName, 'uploadedAt:', uploadedAt);
            return true; // Include recordings with invalid dates rather than filtering them out
          }
          
          return recordingDate >= cutoffDate;
        } catch (error) {
          console.warn('Error parsing date for recording:', recording.originalName, error);
          return true; // Include recordings with date parsing errors
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recording =>
        recording.originalName.toLowerCase().includes(query) ||
        (typeof recording.analyses?.[0]?.transcription === 'string' && 
         recording.analyses[0].transcription.toLowerCase().includes(query))
      );
    }

    setFilteredRecordings(filtered);
  };

  const handleRecordingSelect = (recordingId: string) => {
    const newSelection = new Set(selectedRecordings);
    if (newSelection.has(recordingId)) {
      newSelection.delete(recordingId);
    } else {
      newSelection.add(recordingId);
    }
    setSelectedRecordings(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedRecordings.size === filteredRecordings.length) {
      setSelectedRecordings(new Set());
    } else {
      setSelectedRecordings(new Set(filteredRecordings.map(r => r.id)));
    }
  };

  const handleCustomAnalysis = async () => {
    if (!customQuery.trim() || selectedRecordings.size === 0) {
      alert('Please select recordings and enter a custom query');
      return;
    }

    try {
      setAnalyzingCustom(true);
      
      // Get selected recordings that have completed analyses
      const selectedRecordingData = filteredRecordings.filter(r => 
        selectedRecordings.has(r.id) && 
        isAnalysisCompleted(r.analyses?.[0]?.status)
      );

      if (selectedRecordingData.length === 0) {
        alert('Selected recordings do not have completed analyses available');
        return;
      }

      // Load transcriptions on-demand for selected recordings
      console.log('[CallAnalysis] Loading transcriptions for', selectedRecordingData.length, 'recordings');
      const transcriptionPromises = selectedRecordingData.map(async (recording) => {
        const analysisId = recording.analyses?.[0]?.id;
        if (!analysisId) return null;

        try {
          // Use optimized API to load only transcription data
          const response = await fetch(`/api/analysis-optimized/${analysisId}?include=transcription`);
          const result = await response.json();
          
          if (result.success && result.analysis?.transcription) {
            return {
              recording,
              transcription: result.analysis.transcription
            };
          }
          return null;
        } catch (error) {
          console.error('[CallAnalysis] Error loading transcription for', recording.originalName, error);
          return null;
        }
      });

      const transcriptionResults = (await Promise.all(transcriptionPromises))
        .filter((result): result is { recording: CallRecording; transcription: any } => result !== null);
      
      if (transcriptionResults.length === 0) {
        alert('Unable to load transcriptions for selected recordings. Please try again or select different recordings.');
        return;
      }

      console.log('[CallAnalysis] Successfully loaded', transcriptionResults.length, 'transcriptions');

      // Combine all transcriptions
      const combinedTranscription = transcriptionResults
        .map((result) => `[${result.recording.originalName}]\n${result.transcription || ''}`)
        .join('\n\n---\n\n');

      // Send custom analysis request
      const response = await fetch('/api/analyze-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: combinedTranscription,
          customPrompt: customQuery,
          recordingIds: transcriptionResults.map(result => result.recording.id)
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult({
          query: customQuery,
          result: result.analysis,
          recordingCount: transcriptionResults.length,
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Custom analysis failed:', result.error);
        alert('Analysis failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[CallAnalysis] Custom analysis error:', error);
      alert('An error occurred during analysis');
    } finally {
      setAnalyzingCustom(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (uploadedAt: string) => {
    const now = new Date();
    const uploadDate = new Date(uploadedAt);
    const diffMs = now.getTime() - uploadDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="ml-3 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Call Recording Analysis
          </h1>
          <p className="text-gray-600">
            Analyze your call recordings with AI-powered insights and custom queries
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {TIME_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <div className="text-sm text-gray-500">
                (Total: {callRecordings.length}, Filtered: {filteredRecordings.length})
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search recordings or transcriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex flex-wrap gap-3 items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Selection:</span>
              <button
                onClick={handleSelectAll}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedRecordings.size === filteredRecordings.length && filteredRecordings.length > 0
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
                disabled={filteredRecordings.length === 0}
                title="Keyboard shortcut: Ctrl/Cmd + A"
              >
                {selectedRecordings.size === filteredRecordings.length && filteredRecordings.length > 0 
                  ? 'Deselect All' 
                  : `Select All${filteredRecordings.length > 0 ? ` (${filteredRecordings.length})` : ''}`
                }
              </button>
              {selectedRecordings.size > 0 && selectedRecordings.size < filteredRecordings.length && (
                <button
                  onClick={() => setSelectedRecordings(new Set())}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Keyboard shortcut: Escape"
                >
                  Clear Selection
                </button>
              )}
              {filteredRecordings.length > 0 && (
                <span className="text-xs text-gray-500 ml-2">
                  💡 Ctrl/Cmd+A to select all, Escape to clear
                </span>
              )}
            </div>
            
            {selectedRecordings.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <strong>{selectedRecordings.size}</strong> of {filteredRecordings.length} selected
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recordings List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <FileAudio className="w-5 h-5" />
                    Call Recordings ({filteredRecordings.length})
                  </h2>
                  {filteredRecordings.length > 0 && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={selectedRecordings.size === filteredRecordings.length && filteredRecordings.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        Select all visible recordings
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
                  <p className="text-gray-600">Loading call recordings...</p>
                </div>
              ) : filteredRecordings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileAudio className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No call recordings found for the selected time period</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredRecordings.map((recording) => (
                    <div
                      key={recording.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        selectedRecordings.has(recording.id) ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRecordings.has(recording.id)}
                          onChange={() => handleRecordingSelect(recording.id)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileAudio className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {recording.originalName}
                            </h3>
                            {isAnalysisCompleted(recording.analyses?.[0]?.status) && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {isAnalysisFailed(recording.analyses?.[0]?.status) && (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{formatFileSize(recording.fileSize)}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(recording.uploadedAt)}
                            </span>
                            {recording.analyses?.[0]?.transcription && (
                              <span className="flex items-center gap-1 text-green-600">
                                <MessageSquare className="w-3 h-3" />
                                Transcribed
                              </span>
                            )}
                          </div>
                          
                          {recording.analyses?.[0]?.transcription && typeof recording.analyses[0].transcription === 'string' && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                              {recording.analyses[0].transcription.substring(0, 150)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Custom Analysis
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ask a question about selected recordings:
                  </label>
                  <textarea
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="e.g., What are the main pain points discussed in these calls? What objections were raised?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={4}
                  />
                </div>

                <button
                  onClick={handleCustomAnalysis}
                  disabled={analyzingCustom || selectedRecordings.size === 0 || !customQuery.trim()}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {analyzingCustom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Analyze Selected Calls
                    </>
                  )}
                </button>

                {analysisResult && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Analysis Result</h3>
                    <div className="text-sm text-gray-600 mb-2">
                      Query: "{analysisResult.query}"
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      Analyzed {analysisResult.recordingCount} recording{analysisResult.recordingCount > 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                      {typeof analysisResult.result === 'string' 
                        ? analysisResult.result 
                        : JSON.stringify(analysisResult.result, null, 2)
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
