'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  User
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Logger,
  isAnalysisCompleted,
  isAnalysisProcessing,
  isAnalysisPending,
  isAnalysisFailed,
  isAnalysisInProgress,
  isAnalysisFinished,
  normalizeAnalysisStatus,
  getAnalysisStatusDisplayName
} from '@/lib/utils';
import AnalysisDisplay from '@/components/AnalysisDisplay';
import Chatbot from '@/components/Chatbot';
import { usePolling } from '@/lib/usePolling';
import { useVisibility } from '@/lib/useVisibility';

import type { 
  CallRecording, 
  SpeakerSentiment, 
  SpeakerTone, 
  AnalysisResultData, 
  LegacyAnalysisResult,
  TranscriptionSegment, 
  ParsedTranscription,
  SentimentType,
  ToneType
} from '@/types';

export default function CallHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [callRecordings, setCallRecordings] = useState<CallRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use a ref to store the current selected recording ID to prevent race conditions
  const selectedRecordingIdRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [translating, setTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['speaker-analysis', 'transcription-segments']));
  const [loadingAnalysisData, setLoadingAnalysisData] = useState(false);
  const [loadedAnalysisIds, setLoadedAnalysisIds] = useState<Set<string>>(new Set());
  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(new Map());
  const [failedAnalysisIds, setFailedAnalysisIds] = useState<Set<string>>(new Set());
  
  // Polling and visibility detection
  const { isVisible, elementRef } = useVisibility();
  const [lastPollingUpdate, setLastPollingUpdate] = useState<number>(0);
  
  // Memoize current analysis status to prevent unnecessary re-renders
  const currentAnalysisStatus = useMemo(() => {
    if (!selectedRecording?.analyses?.length) return null;
    
    const analysis = selectedRecording.analyses[0];
    const isInProgress = isAnalysisInProgress(analysis.status);
    
    return {
      id: analysis.id,
      isInProgress,
      status: analysis.status,
      recordingId: selectedRecording.id
    };
  }, [selectedRecording?.analyses, selectedRecording?.id]);
  
  // Optimized reload function to prevent excessive API calls
  const reloadCallRecordings = useCallback(async () => {
    if (!user || loading) return;
    
    // Prevent too frequent polling updates
    const now = Date.now();
    if (now - lastPollingUpdate < 5000) { // 5 second minimum interval
      console.log('[CallHistory] Skipping reload - too frequent');
      return;
    }
    
    setLastPollingUpdate(now);
    
    try {
      console.log('[CallHistory] Polling: Reloading call recordings...');
      const response = await fetch('/api/upload?optimized=true');
      const result = await response.json();
      
      if (result.success) {
        const allFiles = result.uploads || [];
        const audioFiles = allFiles.filter((file: any) => 
          file.mimeType?.startsWith('audio/') || 
          file.originalName?.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)
        );
        
        // Only update if there are actual changes to prevent re-renders
        setCallRecordings(prev => {
          const hasChanges = JSON.stringify(prev) !== JSON.stringify(audioFiles);
          if (hasChanges) {
            console.log('[CallHistory] Polling: Found changes, updating recordings');
            
            // Update selected recording if it exists in the new data
            const updatedSelectedRecording = selectedRecording ? 
              audioFiles.find((f: any) => f.id === selectedRecording.id) : null;
            
            if (updatedSelectedRecording) {
              setSelectedRecording(updatedSelectedRecording);
            }
            
            return audioFiles;
          } else {
            console.log('[CallHistory] Polling: No changes found');
            return prev;
          }
        });
      }
    } catch (error) {
      console.error('[CallHistory] Polling: Error reloading recordings:', error);
    }
  }, [user, loading, lastPollingUpdate, selectedRecording]);
  
  // Set up polling for analysis in progress
  const { isPolling } = usePolling({
    enabled: Boolean(currentAnalysisStatus?.isInProgress),
    isVisible,
    onPoll: reloadCallRecordings,
    onStop: () => {
      console.log('[CallHistory] Stopped polling for analysis status');
    },
    interval: 60000, // 1 minute
    maxDuration: 30 * 60000 // 30 minutes
  });

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

  // Track selectedRecording changes
  useEffect(() => {
    const trackingId = Math.random().toString(36).substr(2, 9);
    console.log(`[CallHistory-STATE-${trackingId}] selectedRecording changed:`, selectedRecording ? {
      id: selectedRecording.id,
      filename: selectedRecording.filename,
      analyses: selectedRecording.analyses?.map(a => ({
        id: a.id,
        status: a.status,
        hasAnalysisResult: !!a.analysisResult,
        hasTranscription: !!a.transcription
      }))
    } : null);
    console.log(`[CallHistory-STATE-${trackingId}] selectedRecordingIdRef.current:`, selectedRecordingIdRef.current);
  }, [selectedRecording]);

  // Track activeTab changes  
  useEffect(() => {
    const trackingId = Math.random().toString(36).substr(2, 9);
    console.log(`[CallHistory-TAB-${trackingId}] activeTab changed to:`, activeTab);
  }, [activeTab]);

  const loadCallRecordings = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('[CallHistory] Starting to load call recordings...');
      setLoading(true);
      const response = await fetch('/api/upload?optimized=true');
      console.log('[CallHistory] Upload API response status:', response.status);
      
      const result = await response.json();
      console.log('[CallHistory] Upload API response data:', result);
      
      if (result.success) {
        const allFiles = result.uploads || [];
        console.log('[CallHistory] All uploaded files:', allFiles.length);
        
        const audioFiles = allFiles.filter((file: any) => 
          file.mimeType?.startsWith('audio/') || 
          file.originalName?.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)
        );
        
        console.log('[CallHistory] Filtered audio files:', audioFiles.length);
        console.log('[CallHistory] Audio files data:', audioFiles);
        
        // Only update if there are actual changes to prevent re-renders
        setCallRecordings(prev => {
          const hasChanges = JSON.stringify(prev) !== JSON.stringify(audioFiles);
          if (!hasChanges) {
            console.log('[CallHistory] No changes detected, skipping update');
            return prev;
          }
          
          console.log('[CallHistory] Changes detected, updating recordings');
          return audioFiles;
        });
        
        // Initialize loaded analysis cache for recordings that already have data
        const alreadyLoadedIds = new Set<string>();
        audioFiles.forEach((recording: CallRecording) => {
          if (recording.analyses && recording.analyses.length > 0) {
            recording.analyses.forEach((analysis: any) => {
              if (analysis.analysisResult || analysis.transcription) {
                alreadyLoadedIds.add(analysis.id);
                console.log('[CallHistory] Marking analysis as already loaded:', analysis.id);
              }
            });
          }
        });
        
        setLoadedAnalysisIds(prev => {
          const hasChanges = prev.size !== alreadyLoadedIds.size || 
                           ![...prev].every(id => alreadyLoadedIds.has(id));
          return hasChanges ? alreadyLoadedIds : prev;
        });
        
        // Only set first recording as selected if no recording is currently selected
        if (audioFiles.length > 0 && !selectedRecording) {
          const firstRecording = audioFiles[0];
          console.log('[CallHistory] Setting first recording as selected:', firstRecording);
          setSelectedRecording(firstRecording);
          selectedRecordingIdRef.current = firstRecording.id;
          
          // Auto-load data for the first recording if needed
          if (firstRecording.analyses?.length) {
            const analysis = firstRecording.analyses[0];
            const isCompleted = isAnalysisCompleted(analysis.status);
            
            if (isCompleted && !analysis.analysisResult && !alreadyLoadedIds.has(analysis.id)) {
              console.log('[CallHistory] Auto-loading data for initially selected recording');
              // Use a small delay to ensure state has settled
              setTimeout(() => {
                if (selectedRecordingIdRef.current === firstRecording.id) {
                  loadAnalysisData(analysis.id, firstRecording.id);
                }
              }, 200);
            }
          }
        }
      } else {
        console.error('[CallHistory] Failed to load recordings:', result.error);
      }
    } catch (error) {
      console.error('[CallHistory] Error loading recordings:', error);
    } finally {
      setLoading(false);
      console.log('[CallHistory] Finished loading recordings');
    }
  }, [user, selectedRecording]);

  const handleRecordingSelect = (recording: CallRecording) => {
    const selectionId = Math.random().toString(36).substr(2, 9);
    console.log(`[CallHistory-${selectionId}] === RECORDING SELECTION START ===`);
    console.log(`[CallHistory-${selectionId}] Selecting recording ID:`, recording.id);
    console.log(`[CallHistory-${selectionId}] Previous selectedRecording ID:`, selectedRecording?.id);
    console.log(`[CallHistory-${selectionId}] Recording title:`, recording.filename);
    console.log(`[CallHistory-${selectionId}] Recording analyses:`, recording.analyses?.map(a => ({
      id: a.id,
      status: a.status,
      hasAnalysisResult: !!a.analysisResult,
      hasTranscription: !!a.transcription
    })));
    console.log(`[CallHistory-${selectionId}] Current activeTab before selection:`, activeTab);
    
    // Immediately set the selected recording and update the ref to prevent race conditions
    console.log(`[CallHistory-${selectionId}] About to setSelectedRecording...`);
    setSelectedRecording(recording);
    selectedRecordingIdRef.current = recording.id;
    console.log(`[CallHistory-${selectionId}] Set selectedRecordingIdRef to:`, recording.id);
    console.log(`[CallHistory-${selectionId}] Current activeTab after selection:`, activeTab);
    
    // Reset to analysis tab when selecting a new recording - do this before data loading
    if (activeTab !== 'analysis') {
      console.log(`[CallHistory-${selectionId}] Resetting activeTab from '${activeTab}' to 'analysis' for new recording`);
      setActiveTab('analysis');
    }
    
    // Auto-load data if needed for the current tab (with a stable reference)
    if (recording.analyses?.length) {
      const analysis = recording.analyses[0];
      const isCompleted = isAnalysisCompleted(analysis.status);
      
      console.log(`[CallHistory-${selectionId}] Analysis info - ID: ${analysis.id}, Status: ${analysis.status}, isCompleted: ${isCompleted}`);
      console.log(`[CallHistory-${selectionId}] Has analysis result: ${!!analysis.analysisResult}, Has transcription: ${!!analysis.transcription}`);
      console.log(`[CallHistory-${selectionId}] Already loaded? ${loadedAnalysisIds.has(analysis.id)}`);
      
      if (isCompleted && !loadedAnalysisIds.has(analysis.id)) {
        // Since we reset to analysis tab above, we should load analysis data
        if (!analysis.analysisResult) {
          console.log(`[CallHistory-${selectionId}] Auto-loading analysis data for selected recording`);
          // Load immediately with the correct recording ID to prevent race conditions
          loadAnalysisData(analysis.id, recording.id);
        } else {
          console.log(`[CallHistory-${selectionId}] Analysis data already present, no need to load`);
        }
      } else if (loadedAnalysisIds.has(analysis.id)) {
        console.log(`[CallHistory-${selectionId}] Skipping API call - data already loaded for analysis:`, analysis.id);
      } else {
        console.log(`[CallHistory-${selectionId}] Not loading data - isCompleted: ${isCompleted}, status: ${analysis.status}`);
      }
    } else {
      console.log(`[CallHistory-${selectionId}] No analyses found for recording`);
    }
    
    console.log(`[CallHistory-${selectionId}] === RECORDING SELECTION END ===`);
  };

  // Function to load analysis data on-demand
  const loadAnalysisData = useCallback(async (analysisId: string, expectedRecordingId?: string) => {
    if (!user || loadingAnalysisData) return;
    
    // If a specific recording ID is expected, check if selection has changed
    if (expectedRecordingId && selectedRecordingIdRef.current !== expectedRecordingId) {
      console.log('[CallHistory] Selection changed, aborting load for:', analysisId);
      return;
    }
    
    // Check if this analysis has failed too many times
    if (failedAnalysisIds.has(analysisId)) {
      console.log('[CallHistory] Analysis marked as permanently failed:', analysisId);
      return;
    }
    
    // Check retry count
    const currentRetries = retryAttempts.get(analysisId) || 0;
    const MAX_RETRIES = 3;
    
    if (currentRetries >= MAX_RETRIES) {
      console.warn('[CallHistory] Max retries reached for analysis:', analysisId);
      setFailedAnalysisIds(prev => new Set([...prev, analysisId]));
      return;
    }
    
    // Check if already loaded AND data is actually present
    const hasInCache = loadedAnalysisIds.has(analysisId);
    const hasActualData = selectedRecording?.analyses?.some(analysis => 
      analysis.id === analysisId && 
      (analysis.analysisResult || analysis.transcription)
    );
    
    if (hasInCache && hasActualData) {
      console.log('[CallHistory] Analysis data already loaded for:', analysisId);
      return;
    }
    
    if (hasInCache && !hasActualData) {
      console.log('[CallHistory] Cache indicates loaded but data missing, removing from cache and reloading:', analysisId);
      setLoadedAnalysisIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(analysisId);
        return newSet;
      });
    }
    
    // Increment retry count
    setRetryAttempts(prev => new Map(prev.set(analysisId, currentRetries + 1)));
    
    try {
      setLoadingAnalysisData(true);
      console.log('[CallHistory] Loading analysis data on-demand for:', analysisId);
      
      const response = await fetch(`/api/analysis-optimized/${analysisId}?include=all`);
      if (!response.ok) {
        throw new Error(`Failed to fetch analysis data: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[CallHistory] On-demand API response:', result);
      
      if (result.success && result.analysis) {
        console.log('[CallHistory] Successfully loaded analysis data on-demand');
        console.log('[CallHistory] Loaded analysis result:', result.analysis.analysisResult);
        console.log('[CallHistory] Loaded transcription:', result.analysis.transcription);
        
        // Validate that we actually have some data before marking as loaded
        const hasAnalysisResult = result.analysis.analysisResult && Object.keys(result.analysis.analysisResult).length > 0;
        const hasTranscription = result.analysis.transcription && result.analysis.transcription.length > 0;
        
        if (hasAnalysisResult || hasTranscription) {
          // Mark as loaded only if we have actual data
          setLoadedAnalysisIds(prev => new Set([...prev, analysisId]));
          // Clear retry count on successful load
          setRetryAttempts(prev => {
            const newMap = new Map(prev);
            newMap.delete(analysisId);
            return newMap;
          });
          console.log('[CallHistory] Marking analysis as loaded (has data):', analysisId);
        } else {
          console.warn('[CallHistory] Analysis response successful but no actual data found for:', analysisId);
        }
        
        // Update the recording with the loaded data
        // We need to find the correct recording to update, whether it's the currently selected one or not
        const targetRecordingId = expectedRecordingId || selectedRecording?.id;
        
        if (targetRecordingId) {
          console.log(`[CallHistory] Before update - selectedRecording.id:`, selectedRecording?.id);
          console.log(`[CallHistory] Before update - expectedRecordingId:`, expectedRecordingId);
          console.log(`[CallHistory] Before update - selectedRecordingIdRef.current:`, selectedRecordingIdRef.current);
          console.log(`[CallHistory] Before update - analysisId:`, analysisId);
          console.log(`[CallHistory] Before update - targetRecordingId:`, targetRecordingId);
          
          // First, update the main recordings list
          setCallRecordings(prev => prev.map(recording => {
            if (recording.id === targetRecordingId) {
              const updatedAnalyses = recording.analyses?.map(analysis => 
                analysis.id === analysisId 
                  ? { 
                      ...analysis, 
                      analysisResult: result.analysis.analysisResult, 
                      transcription: result.analysis.transcription 
                    }
                  : analysis
              ) || [];
              
              const updatedRecording = { ...recording, analyses: updatedAnalyses };
              console.log(`[CallHistory] Updated recording in main list:`, {
                id: updatedRecording.id,
                filename: updatedRecording.filename,
                analyses: updatedRecording.analyses?.map(a => ({
                  id: a.id,
                  hasAnalysisResult: !!a.analysisResult,
                  hasTranscription: !!a.transcription
                }))
              });
              
              // If this is the currently selected recording, also update the selected recording state
              if (selectedRecordingIdRef.current === targetRecordingId) {
                console.log(`[CallHistory] Target recording is currently selected, updating selectedRecording state`);
                setSelectedRecording(updatedRecording);
              }
              
              return updatedRecording;
            }
            return recording;
          }));
          
          console.log(`[CallHistory] Successfully updated recordings list for target recording:`, targetRecordingId);
        } else {
          console.log(`[CallHistory] Skipping state update - no target recording ID available`);
        }
      } else {
        console.error('[CallHistory] Failed to load analysis data:', result.error || 'Unknown error');
        // Don't mark as loaded if the request failed
      }
    } catch (error) {
      console.error('[CallHistory] Error loading analysis data:', error);
    } finally {
      setLoadingAnalysisData(false);
    }
  }, [user, loadingAnalysisData, failedAnalysisIds, retryAttempts, loadedAnalysisIds, selectedRecording]);

  const handleDelete = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording and its analysis?')) return;

    try {
      const response = await fetch(`/api/upload?id=${recordingId}`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        const updatedRecordings = callRecordings.filter(r => r.id !== recordingId);
        setCallRecordings(updatedRecordings);
        if (selectedRecording?.id === recordingId) {
          setSelectedRecording(updatedRecordings.length > 0 ? updatedRecordings[0] : null);
        }
      } else {
        alert('Failed to delete recording: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('An error occurred while deleting the recording.');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL call recordings? This action cannot be undone.')) return;

    try {
      const response = await fetch('/api/upload/all', { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        setCallRecordings([]);
        setSelectedRecording(null);
      } else {
        alert('Failed to delete all recordings: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting all recordings:', error);
      alert('An error occurred while deleting all recordings.');
    }
  };

  const downloadAnalysisJson = () => {
    if (!selectedRecording || !selectedRecording.analyses || selectedRecording.analyses.length === 0) return;
    const analysis = selectedRecording.analyses[0];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysis.analysisResult, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `analysis_${selectedRecording.originalName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleTabChange = (tab: string) => {
    console.log('[CallHistory] Changing tab from:', activeTab, 'to:', tab);
    console.log('[CallHistory] Selected recording:', selectedRecording?.originalName);
    console.log('[CallHistory] Recording has analysis:', selectedRecording?.analyses?.length);
    if (selectedRecording?.analyses?.length) {
      console.log('[CallHistory] Analysis status:', selectedRecording.analyses[0].status);
    }
    setActiveTab(tab);
    
    // Auto-load data when switching to tabs that need it
    if (selectedRecording?.analyses?.length) {
      const analysis = selectedRecording.analyses[0];
      const isCompleted = isAnalysisCompleted(analysis.status);
      
      if (isCompleted && !loadedAnalysisIds.has(analysis.id)) {
        if (tab === 'analysis' && !analysis.analysisResult) {
          console.log('[CallHistory] Auto-loading analysis data for analysis tab');
          loadAnalysisData(analysis.id, selectedRecording.id);
        } else if (tab === 'transcription' && !analysis.transcription) {
          console.log('[CallHistory] Auto-loading analysis data for transcription tab');
          loadAnalysisData(analysis.id, selectedRecording.id);
        }
      } else if (loadedAnalysisIds.has(analysis.id)) {
        console.log('[CallHistory] Skipping API call - data already loaded for:', analysis.id);
      }
    }
    
    // Clear translation when switching tabs
    if (tab !== 'transcription') {
      setTranslatedText('');
    }
    // Close chatbot when switching to other tabs
    if (tab !== 'chat') {
      setShowChatbot(false);
    }
  };

  const translateTranscription = async (text: string, targetLang: string) => {
    console.log('[CallHistory] Translating text to:', targetLang);
    setTranslating(true);
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          targetLanguage: targetLang,
          sourceLanguage: 'auto' // Auto-detect source language
        }),
      });

      const result = await response.json();
      console.log('[CallHistory] Translation result:', result);

      if (result.success) {
        setTranslatedText(result.translatedText);
      } else {
        console.error('[CallHistory] Translation failed:', result.error);
        alert('Translation failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[CallHistory] Translation error:', error);
      alert('An error occurred during translation');
    } finally {
      setTranslating(false);
    }
  };

  const getTranscriptionText = (transcriptionData: any): string => {
    if (typeof transcriptionData === 'string') {
      return transcriptionData;
    }
    
    if (typeof transcriptionData === 'object' && transcriptionData?.diarized_transcription) {
      return transcriptionData.diarized_transcription
        .map((segment: any) => `${segment.speaker}: ${segment.text}`)
        .join('\n');
    }
    
    return JSON.stringify(transcriptionData, null, 2);
  };

  const handleTranslate = () => {
    if (!selectedRecording?.analyses?.[0]?.transcription) return;
    
    const transcriptionData = selectedRecording.analyses[0].transcription;
    let parsedData = transcriptionData;
    
    if (typeof transcriptionData === 'string') {
      try {
        parsedData = JSON.parse(transcriptionData);
      } catch (e) {
        // Use as is if not valid JSON
      }
    }
    
    const textToTranslate = getTranscriptionText(parsedData);
    translateTranscription(textToTranslate, targetLanguage);
  };

  const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'te', name: 'Telugu' },
    { code: 'mr', name: 'Marathi' },
    { code: 'ta', name: 'Tamil' },
    { code: 'ur', name: 'Urdu' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'kn', name: 'Kannada' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'pa', name: 'Punjabi' }
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="ml-3 text-gray-600">Loading Call History...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Left Panel: Call Recordings List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Call History</h1>
          <button
            onClick={handleDeleteAll}
            disabled={callRecordings.length === 0}
            className="px-3 py-1 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete All
          </button>
        </div>
        <div className="overflow-y-auto flex-grow">
          {callRecordings.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <FileAudio className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No call recordings found.</p>
            </div>
          ) : (
            <ul>
              {callRecordings.map(rec => (
                <li
                  key={rec.id}
                  onClick={() => handleRecordingSelect(rec)}
                  className={`p-4 cursor-pointer border-b border-gray-200 ${selectedRecording?.id === rec.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{rec.originalName}</h3>
                      <p className="text-xs text-gray-500">{formatFileSize(rec.fileSize)} - {new Date(rec.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }} 
                      className="text-gray-400 hover:text-red-600 flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                      title="Delete recording"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Panel: Analysis Details */}
      <div className="w-2/3 bg-gray-50 flex flex-col">
        {selectedRecording ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-800">{selectedRecording.originalName}</h2>
              <p className="text-sm text-gray-500">Uploaded on {new Date(selectedRecording.uploadedAt).toLocaleString()}</p>
            </div>
            
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex gap-2">
                <button onClick={() => handleTabChange('analysis')} className={`px-4 py-2 text-sm rounded-md ${activeTab === 'analysis' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <BarChart3 className="w-4 h-4 inline-block mr-2"/>Performance Metrics
                </button>
                <button onClick={() => handleTabChange('transcription')} className={`px-4 py-2 text-sm rounded-md ${activeTab === 'transcription' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <FileText className="w-4 h-4 inline-block mr-2"/>Transcription
                </button>
                <button onClick={() => handleTabChange('chat')} className={`px-4 py-2 text-sm rounded-md ${activeTab === 'chat' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} relative`}>
                  <MessageCircle className="w-4 h-4 inline-block mr-2"/>AI Chat
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                </button>
                <button onClick={downloadAnalysisJson} className="px-4 py-2 text-sm rounded-md bg-gray-200 text-gray-700">
                  <Download className="w-4 h-4 inline-block mr-2"/>Download JSON
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-grow p-6">
              {selectedRecording.analyses && selectedRecording.analyses.length > 0 ? (
                (() => {
                  const analysis = selectedRecording.analyses[0];
                  const renderId = Math.random().toString(36).substr(2, 9);
                  
                  console.log(`[CallHistory-RENDER-${renderId}] === RENDER START ===`);
                  console.log(`[CallHistory-RENDER-${renderId}] Selected recording ID:`, selectedRecording.id);
                  console.log(`[CallHistory-RENDER-${renderId}] Selected recording filename:`, selectedRecording.filename);
                  console.log(`[CallHistory-RENDER-${renderId}] Analysis ID:`, analysis.id);
                  console.log(`[CallHistory-RENDER-${renderId}] Analysis status:`, analysis.status);
                  console.log(`[CallHistory-RENDER-${renderId}] Analysis status type:`, typeof analysis.status);
                  console.log(`[CallHistory-RENDER-${renderId}] Active tab:`, activeTab);
                  console.log(`[CallHistory-RENDER-${renderId}] Analysis result exists:`, !!analysis.analysisResult);
                  console.log(`[CallHistory-RENDER-${renderId}] Transcription exists:`, !!analysis.transcription);
                  console.log(`[CallHistory-RENDER-${renderId}] Analysis result type:`, typeof analysis.analysisResult);
                  
                  // Log a summary of analysis result content if it exists
                  if (analysis.analysisResult && typeof analysis.analysisResult === 'object') {
                    console.log(`[CallHistory-RENDER-${renderId}] Analysis result keys:`, Object.keys(analysis.analysisResult));
                  } else {
                    console.log(`[CallHistory-RENDER-${renderId}] Analysis result content:`, analysis.analysisResult);
                  }
                  
                  // Handle status checking using enum-based utility functions
                  const isCompleted = isAnalysisCompleted(analysis.status);
                  const isFailed = isAnalysisFailed(analysis.status);
                  const isPending = isAnalysisPending(analysis.status);
                  const isProcessing = isAnalysisProcessing(analysis.status);
                  const inProgress = isAnalysisInProgress(analysis.status);
                  const finished = isAnalysisFinished(analysis.status);
                  
                  console.log(`[CallHistory-RENDER-${renderId}] Status checks - isCompleted:`, isCompleted, 'isFailed:', isFailed, 'isPending:', isPending, 'isProcessing:', isProcessing, 'inProgress:', inProgress, 'finished:', finished);
                  console.log(`[CallHistory-RENDER-${renderId}] Raw status:`, analysis.status, 'Normalized:', normalizeAnalysisStatus(analysis.status));
                  
                  if (isCompleted) {
                    console.log(`[CallHistory-RENDER-${renderId}] Analysis is completed, checking active tab...`);
                    if (activeTab === 'analysis') {
                      console.log(`[CallHistory-RENDER-${renderId}] Rendering analysis tab with data available:`, !!analysis.analysisResult);
                      if (!analysis.analysisResult) {
                        console.warn(`[CallHistory-RENDER-${renderId}] No analysis result available for completed analysis, forcing reload...`);
                        // Check if this analysis has failed permanently
                        if (failedAnalysisIds.has(analysis.id)) {
                          console.log(`[CallHistory-RENDER-${renderId}] Analysis marked as permanently failed, showing error`);
                          return (
                            <div className="text-center py-8">
                              <div className="text-red-600 mb-4">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                                <p className="font-medium">Unable to load analysis data</p>
                              </div>
                              <p className="text-sm text-gray-500">
                                The analysis data could not be loaded after multiple attempts. Please try refreshing the page.
                              </p>
                            </div>
                          );
                        }
                        // Force reload data when analysis is completed but data is missing
                        console.log(`[CallHistory-RENDER-${renderId}] Triggering loadAnalysisData for missing data`);
                        loadAnalysisData(analysis.id, selectedRecording?.id);
                        return (
                          <div className="text-center py-8">
                            <div className="flex items-center justify-center mb-4">
                              <Loader2 className="w-6 h-6 mr-2 animate-spin text-blue-600" />
                              <p className="text-gray-600">Loading analysis data...</p>
                            </div>
                            <p className="text-sm text-gray-500">This may take a few moments</p>
                          </div>
                        );
                      }
                      console.log(`[CallHistory-RENDER-${renderId}] Returning AnalysisDisplay component`);
                      return <AnalysisDisplay analysisResult={analysis.analysisResult} />;
                    }
                    if (activeTab === 'transcription') {
                      const loggableTranscription = typeof analysis.transcription === 'string' ? analysis.transcription.substring(0,100) + '...' : '[Object]';
                      console.log(`[CallHistory-RENDER-${renderId}] Rendering transcription tab with data:`, loggableTranscription);
                      
                      let transcriptionData: string | ParsedTranscription | undefined = analysis.transcription;
                      if (typeof transcriptionData === 'string') {
                        try {
                          transcriptionData = JSON.parse(transcriptionData);
                        } catch (e) {
                          // If it's not valid JSON, treat as plain text
                        }
                      }

                      const analysisResult = analysis.analysisResult as any; // Using any for legacy compatibility
                      console.log('[CallHistory] Analysis Result for Transcription Tab:', analysisResult);

                      // Extract sentiment and tone data directly from transcription if available
                      let sentimentAnalysis: SpeakerSentiment[] = [];
                      let toneAnalysis: SpeakerTone[] = [];
                      let speakerMapping: { [key: string]: string } = {};
                      let customerName: string | undefined;

                      // If transcription data contains sentiment and tone per segment, aggregate by speaker
                      if (typeof transcriptionData === 'object' && transcriptionData?.diarized_transcription) {
                        const speakerSentiments: { [key: string]: string[] } = {};
                        const speakerTones: { [key: string]: string[] } = {};
                        
                        transcriptionData.diarized_transcription.forEach((segment: any) => {
                          if (segment.sentiment) {
                            if (!speakerSentiments[segment.speaker]) speakerSentiments[segment.speaker] = [];
                            speakerSentiments[segment.speaker].push(segment.sentiment);
                          }
                          if (segment.tone) {
                            if (!speakerTones[segment.speaker]) speakerTones[segment.speaker] = [];
                            speakerTones[segment.speaker].push(segment.tone);
                          }
                        });

                        // Calculate dominant sentiment and tone per speaker
                        Object.keys(speakerSentiments).forEach(speaker => {
                          const sentiments = speakerSentiments[speaker];
                          const dominantSentiment = sentiments.reduce((a, b, _, arr) => 
                            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                          );
                          sentimentAnalysis.push({ speaker, sentiment: dominantSentiment as SentimentType });
                        });

                        Object.keys(speakerTones).forEach(speaker => {
                          const tones = speakerTones[speaker];
                          const dominantTone = tones.reduce((a, b, _, arr) => 
                            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                          );
                          toneAnalysis.push({ speaker, tone: dominantTone as ToneType });
                        });
                      }

                      // Try to predict speaker names based on conversation context
                      if (typeof transcriptionData === 'object' && transcriptionData?.diarized_transcription && sentimentAnalysis.length > 0) {
                        const speakers = [...new Set(transcriptionData.diarized_transcription.map((s: any) => s.speaker))];
                        
                        // Simple heuristic: Speaker with more professional/helpful tone is likely the agent
                        speakers.forEach((speaker: string) => {
                          const speakerSegments = transcriptionData.diarized_transcription.filter((s: any) => s.speaker === speaker);
                          const avgLength = speakerSegments.reduce((sum: number, s: any) => sum + s.text.length, 0) / speakerSegments.length;
                          
                          // Look for keywords that suggest customer vs agent
                          const customerKeywords = ['help', 'need', 'want', 'buy', 'purchase', 'issue', 'problem'];
                          const agentKeywords = ['assist', 'provide', 'offer', 'recommend', 'company', 'service'];
                          
                          const speakerText = speakerSegments.map((s: any) => s.text).join(' ').toLowerCase();
                          const customerScore = customerKeywords.filter(word => speakerText.includes(word)).length;
                          const agentScore = agentKeywords.filter(word => speakerText.includes(word)).length;
                          
                          if (agentScore > customerScore) {
                            speakerMapping[speaker] = 'Sales Agent';
                          } else if (customerScore > agentScore) {
                            speakerMapping[speaker] = 'Customer';
                            // Try to extract a name if mentioned
                            const nameMatch = speakerText.match(/my name is ([a-zA-Z]+)|i'm ([a-zA-Z]+)|this is ([a-zA-Z]+)/i);
                            if (nameMatch) {
                              const extractedName = nameMatch[1] || nameMatch[2] || nameMatch[3];
                              speakerMapping[speaker] = extractedName;
                              customerName = extractedName;
                            }
                          } else {
                            speakerMapping[speaker] = speaker; // Keep original
                          }
                        });
                      }

                      // Fallback to analysis result data if transcription doesn't have the info
                      if (sentimentAnalysis.length === 0) {
                        sentimentAnalysis = analysisResult?.sentiment_analysis || 
                                          analysisResult?.parameters?.sentiment_analysis || 
                                          [];
                      }
                      
                      if (toneAnalysis.length === 0) {
                        toneAnalysis = analysisResult?.tone_analysis || 
                                     analysisResult?.parameters?.tone_analysis || 
                                     [];
                      }
                      
                      if (Object.keys(speakerMapping).length === 0) {
                        speakerMapping = analysisResult?.speaker_mapping || 
                                       analysisResult?.parameters?.speaker_mapping || 
                                       {};
                      }
                      
                      if (!customerName) {
                        customerName = analysisResult?.customer_name || 
                                     analysisResult?.parameters?.customer_name;
                      }

                      console.log('[CallHistory] Sentiment Analysis Data:', sentimentAnalysis);
                      console.log('[CallHistory] Tone Analysis Data:', toneAnalysis);
                      console.log('[CallHistory] Speaker Mapping:', speakerMapping);
                      console.log('[CallHistory] Customer Name:', customerName);

                      const speakers: string[] = (typeof transcriptionData === 'object' && transcriptionData?.diarized_transcription) 
                        ? [...new Set(transcriptionData.diarized_transcription.map((s: any) => s.speaker))] 
                        : [];
                      console.log('[CallHistory] Speakers found in transcription:', speakers);
                      const isChatView = speakers.length === 2;
                      
                      return (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                          <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                  <FileText className="w-5 h-5" />
                                  Call Transcription
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Complete transcript of the call recording
                                </p>
                              </div>
                              
                              {/* Translation Controls & View Options */}
                              <div className="flex items-center gap-3 flex-wrap">
                                {/* Quick Expand/Collapse Controls */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setCollapsedSections(new Set())}
                                    className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                                  >
                                    Expand All
                                  </button>
                                  <button
                                    onClick={() => setCollapsedSections(new Set(['speaker-analysis', 'transcription-segments']))}
                                    className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                                  >
                                    Collapse All
                                  </button>
                                </div>

                                {/* Toggle for detailed analysis */}
                                <label className="flex items-center gap-2 text-sm text-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={showDetailedAnalysis}
                                    onChange={(e) => setShowDetailedAnalysis(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  Show detailed metrics
                                </label>

                                <select
                                  value={targetLanguage}
                                  onChange={(e) => setTargetLanguage(e.target.value)}
                                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                  {languageOptions.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                      {lang.name}
                                    </option>
                                  ))}
                                </select>
                                
                                <button
                                  onClick={handleTranslate}
                                  disabled={translating || !transcriptionData}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors"
                                >
                                  {translating ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Translating...
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-4 h-4" />
                                      Translate
                                    </>
                                  )}
                                </button>
                                
                                {translatedText && (
                                  <button
                                    onClick={() => setTranslatedText('')}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm transition-colors"
                                  >
                                    Show Original
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="p-6">
                            {transcriptionData ? (
                              <div>
                                {/* Transcription Summary */}
                                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mb-6 border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-gray-800 mb-2">Transcription Overview</h4>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        {typeof transcriptionData === 'object' && transcriptionData?.diarized_transcription && (
                                          <>
                                            <div className="text-center">
                                              <span className="block text-lg font-bold text-blue-600">
                                                {speakers.length}
                                              </span>
                                              <span className="text-gray-600">Speakers</span>
                                            </div>
                                            <div className="text-center">
                                              <span className="block text-lg font-bold text-green-600">
                                                {(transcriptionData as ParsedTranscription).diarized_transcription.length}
                                              </span>
                                              <span className="text-gray-600">Segments</span>
                                            </div>
                                            <div className="text-center">
                                              <span className="block text-lg font-bold text-purple-600">
                                                {sentimentAnalysis.length > 0 ? 
                                                  sentimentAnalysis.filter(s => s.sentiment === 'positive').length : '—'
                                                }
                                              </span>
                                              <span className="text-gray-600">Positive</span>
                                            </div>
                                            <div className="text-center">
                                              <span className="block text-lg font-bold text-orange-600">
                                                {transcriptionData.original_language || 'Auto-detected'}
                                              </span>
                                              <span className="text-gray-600">Language</span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Show translation if available */}
                                {translatedText ? (
                                  <div className="space-y-4">
                                    <div className="bg-blue-50 p-3 rounded-md">
                                      <span className="text-sm font-medium text-blue-800">
                                        Translation ({languageOptions.find(l => l.code === targetLanguage)?.name})
                                      </span>
                                    </div>
                                    <div className="prose max-w-none">
                                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {translatedText}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  /* Original transcription */
                                  <div>
                                    {typeof transcriptionData === 'object' && transcriptionData?.diarized_transcription ? (
                                      <div className="space-y-4">
                                        {/* Language info */}
                                        {transcriptionData.original_language && (
                                          <div className="bg-blue-50 p-3 rounded-md mb-4">
                                            <span className="text-sm font-medium text-blue-800">
                                              Language: {transcriptionData.original_language}
                                            </span>
                                          </div>
                                        )}

                                        {/* Speaker Analysis - Collapsible */}
                                        {(sentimentAnalysis.length > 0 || toneAnalysis.length > 0) && (
                                          <div className="border border-gray-200 rounded-lg mb-4">
                                            <button
                                              onClick={() => toggleSection('speaker-analysis')}
                                              className="w-full p-4 text-left hover:bg-gray-50 flex justify-between items-center rounded-t-lg"
                                            >
                                              <div className="flex items-center gap-2">
                                                <User className="w-5 h-5 text-blue-600" />
                                                <span className="font-medium text-gray-700">Speaker Analysis</span>
                                                <span className="text-sm text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                                                  {speakers.length} speakers
                                                </span>
                                              </div>
                                              <span className="text-gray-400">
                                                {collapsedSections.has('speaker-analysis') ? '▼' : '▲'}
                                              </span>
                                            </button>
                                            
                                            {!collapsedSections.has('speaker-analysis') && (
                                              <div className="border-t border-gray-200 p-4 bg-gray-50">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  {speakers.map((speaker: string, index: number) => {
                                                      const genericSpeakerName = `Speaker ${index + 1}`;
                                                      const sentiment = sentimentAnalysis.find((s: SpeakerSentiment) => s.speaker === speaker);
                                                      const tone = toneAnalysis.find((t: SpeakerTone) => t.speaker === speaker);
                                                      return (
                                                          <div key={speaker} className="p-3 bg-white rounded-lg border shadow-sm">
                                                              <h4 className="font-semibold text-gray-800 mb-2">{genericSpeakerName}</h4>
                                                              <div className="space-y-1">
                                                                {sentiment && (
                                                                  <div className="flex items-center gap-2">
                                                                    <span className="text-sm text-gray-600">Sentiment:</span>
                                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                                      sentiment.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                                                      sentiment.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                                                      'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                      {sentiment.sentiment}
                                                                    </span>
                                                                  </div>
                                                                )}
                                                                {tone && (
                                                                  <div className="flex items-center gap-2">
                                                                    <span className="text-sm text-gray-600">Tone:</span>
                                                                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
                                                                      {tone.tone}
                                                                    </span>
                                                                  </div>
                                                                )}
                                                              </div>
                                                          </div>
                                                      )
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Conversation Transcript - Collapsible */}
                                        <div className="border border-gray-200 rounded-lg">
                                          <button
                                            onClick={() => toggleSection('transcription-segments')}
                                            className="w-full p-4 text-left hover:bg-gray-50 flex justify-between items-center rounded-t-lg"
                                          >
                                            <div className="flex items-center gap-2">
                                              <MessageCircle className="w-5 h-5 text-green-600" />
                                              <span className="font-medium text-gray-700">Conversation Transcript</span>
                                              <span className="text-sm text-gray-500 bg-green-50 px-2 py-1 rounded-full">
                                                {(transcriptionData as ParsedTranscription).diarized_transcription.length} segments
                                              </span>
                                            </div>
                                            <span className="text-gray-400">
                                              {collapsedSections.has('transcription-segments') ? '▼' : '▲'}
                                            </span>
                                          </button>
                                          
                                          {!collapsedSections.has('transcription-segments') && (
                                            <div className="border-t border-gray-200 p-4 space-y-3 max-h-96 overflow-y-auto">
                                              {(transcriptionData as ParsedTranscription).diarized_transcription.map((segment: any, index: number) => {
                                                // Use generic speaker names instead of actual speaker names
                                                const speakerIndex = speakers.indexOf(segment.speaker);
                                                const genericSpeakerName = `Speaker ${speakerIndex + 1}`;
                                                const isSpeaker1 = isChatView && segment.speaker === speakers[0];

                                                return (
                                                  <div key={index} className={`flex flex-col ${isChatView ? (isSpeaker1 ? 'items-start' : 'items-end') : 'items-start'}`}>
                                                      <div className={`flex items-center gap-2 ${isChatView && !isSpeaker1 ? 'flex-row-reverse' : ''}`}>
                                                          <span className="font-bold text-sm text-gray-600">{genericSpeakerName}</span>
                                                          {showDetailedAnalysis && (segment as any).sentiment && (
                                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                              (segment as any).sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                                              (segment as any).sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                                              'bg-gray-100 text-gray-800'
                                                            }`}>
                                                              {(segment as any).sentiment}
                                                            </span>
                                                          )}
                                                          {showDetailedAnalysis && (segment as any).tone && (
                                                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                                              {(segment as any).tone}
                                                            </span>
                                                          )}
                                                      </div>
                                                      <div className={`mt-1 p-3 rounded-lg max-w-xl ${isChatView ? (isSpeaker1 ? 'bg-indigo-50' : 'bg-green-50') : 'bg-gray-100'}`}>
                                                          <p className="text-gray-800 leading-relaxed">
                                                              {segment.text}
                                                          </p>
                                                          <div className="flex items-center justify-between mt-2">
                                                            {segment.timestamp && (
                                                                <p className={`text-xs text-gray-400 ${isChatView ? (isSpeaker1 ? 'text-left' : 'text-right') : 'text-left'}`}>
                                                                    {segment.timestamp}
                                                                </p>
                                                            )}
                                                            {showDetailedAnalysis && (segment as any).confidence_level && (
                                                              <span className={`text-xs px-2 py-1 rounded ${
                                                                (segment as any).confidence_level === 'high' ? 'bg-green-50 text-green-700' :
                                                                (segment as any).confidence_level === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                                                                'bg-gray-50 text-gray-700'
                                                              }`}>
                                                                {(segment as any).confidence_level} confidence
                                                              </span>
                                                            )}
                                                          </div>
                                                      </div>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      /* Plain text transcription */
                                      <div className="prose max-w-none">
                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                          {typeof transcriptionData === 'string' ? transcriptionData : JSON.stringify(transcriptionData, null, 2)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* No transcription data available, force reload if analysis is completed */
                              (() => {
                                if (isCompleted && !transcriptionData) {
                                  console.warn('[CallHistory] Analysis completed but no transcription data, forcing reload...');
                                  // Check if this analysis has failed permanently
                                  if (failedAnalysisIds.has(analysis.id)) {
                                    return (
                                      <div className="text-center py-8">
                                        <div className="text-red-600 mb-4">
                                          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                                          <p className="font-medium">Unable to load transcription data</p>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                          The transcription data could not be loaded after multiple attempts. Please try refreshing the page.
                                        </p>
                                      </div>
                                    );
                                  }
                                  loadAnalysisData(analysis.id, selectedRecording?.id);
                                }
                                return (
                                  <div className="text-center py-8">
                                    <div className="flex items-center justify-center mb-4">
                                      <Loader2 className="w-6 h-6 mr-2 animate-spin text-blue-600" />
                                      <p className="text-gray-600">Loading transcription data...</p>
                                    </div>
                                    <p className="text-sm text-gray-500">This may take a few moments</p>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      );
                    }
                    if (activeTab === 'chat') {
                      console.log('[CallHistory] Rendering chat tab');
                      return (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                          <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                  <MessageCircle className="w-5 h-5" />
                                  AI Chat Assistant
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Ask questions about "{selectedRecording.originalName}" call recording
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-6 h-full">
                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-blue-800">Chat about this call</span>
                              </div>
                              <p className="text-blue-700 text-sm">
                                Ask me anything about this call recording! I can help you understand the transcription, 
                                analysis results, key points, customer sentiment, and provide insights for improvement.
                              </p>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                              <h4 className="font-semibold text-gray-800 mb-2">💡 Try asking:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="space-y-1">
                                  <div className="text-gray-600">• "What was the main topic discussed?"</div>
                                  <div className="text-gray-600">• "How did the customer respond?"</div>
                                  <div className="text-gray-600">• "What objections were raised?"</div>
                                  <div className="text-gray-600">• "What were the key outcomes?"</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-gray-600">• "What was the overall sentiment?"</div>
                                  <div className="text-gray-600">• "How can I improve next time?"</div>
                                  <div className="text-gray-600">• "What questions did I ask?"</div>
                                  <div className="text-gray-600">• "Did I close properly?"</div>
                                </div>
                              </div>
                            </div>

                            <div className="text-center">
                              <button
                                onClick={() => setShowChatbot(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                              >
                                <MessageCircle className="w-5 h-5" />
                                Start Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  } else if (isFailed) {
                    console.log('[CallHistory] Analysis failed');
                    if (activeTab === 'chat') {
                      return (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                          <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                  <MessageCircle className="w-5 h-5" />
                                  AI Chat Assistant
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Chat about "{selectedRecording.originalName}" call recording
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="bg-amber-50 p-4 rounded-lg mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <span className="font-semibold text-amber-800">Limited Chat Available</span>
                              </div>
                              <p className="text-amber-700 text-sm mb-4">
                                Analysis failed for this recording, but you can still ask general questions about the file.
                              </p>
                              <button
                                onClick={() => setShowChatbot(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Start Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center text-red-600 mb-2">
                          <XCircle className="w-5 h-5 mr-2"/>
                          <h3 className="font-semibold">Analysis Failed</h3>
                        </div>
                        <p className="text-red-700">
                          The analysis for this recording could not be completed. Please try uploading the file again.
                        </p>
                      </div>
                    );
                  } else if (inProgress) {
                    console.log('[CallHistory] Analysis in progress, status:', analysis.status);
                    console.log('[CallHistory] Status check results - isPending:', isPending, 'isProcessing:', isProcessing, 'inProgress:', inProgress);
                    if (activeTab === 'chat') {
                      return (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                          <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                  <MessageCircle className="w-5 h-5" />
                                  AI Chat Assistant
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  Chat about "{selectedRecording.originalName}" call recording
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                <span className="font-semibold text-blue-800">Analysis in Progress</span>
                              </div>
                              <p className="text-blue-700 text-sm mb-4">
                                Your call is being analyzed. You can still start a chat, but detailed insights will be limited until analysis completes.
                              </p>
                              <button
                                onClick={() => setShowChatbot(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Start Chat
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div 
                        ref={elementRef}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-6"
                      >
                        <div className="flex items-center text-blue-600 mb-2">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin"/>
                          <h3 className="font-semibold">Analysis In Progress</h3>
                        </div>
                        <p className="text-blue-700 mb-2">
                          Your call recording is being analyzed. This typically takes 5-10 minutes.
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPolling && (
                              <div className="flex items-center gap-2 text-blue-600 text-sm">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>Auto-updating status</span>
                              </div>
                            )}
                            {!isPolling && currentAnalysisStatus?.isInProgress && (
                              <div className="flex items-center gap-2 text-blue-500 text-sm">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span>Monitoring for updates</span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-blue-500">
                            {currentAnalysisStatus?.isInProgress ? 'Status checks automatically' : 'Will resume checking when analysis is active'}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()
              ) : (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center text-gray-500 mb-2">
                    <AlertTriangle className="w-5 h-5 mr-2"/>
                    <h3 className="font-semibold">No Analysis Available</h3>
                  </div>
                  <p className="text-gray-600 mb-4">
                    This recording has not been analyzed yet. Please upload it for analysis first.
                  </p>
                  
                  {/* Still allow chat even without analysis */}
                  {activeTab === 'chat' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">Limited Chat Available</span>
                      </div>
                      <p className="text-blue-700 text-sm mb-4">
                        You can still chat about this recording, but detailed analysis insights won't be available.
                      </p>
                      <button
                        onClick={() => setShowChatbot(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Start Chat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a recording to view its analysis.</p>
          </div>
        )}
      </div>
      
      {/* Chatbot */}
      {showChatbot && selectedRecording && user && (
        <Chatbot
          userId={user.id}
          uploadId={selectedRecording.id}
          onClose={() => setShowChatbot(false)}
        />
      )}
    </div>
  );
}
