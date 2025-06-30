'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileAudio,
  Trash2,
  Download,
  FileText,
  BarChart3,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Logger } from '@/lib/utils';
import AnalysisDisplay from '@/components/AnalysisDisplay';

interface CallRecording {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
  analyses?: Array<{
    id:string;
    status: string;
    transcription?: string;
    analysisResult?: any;
    createdAt: string;
  }>;
}

export default function CallHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [callRecordings, setCallRecordings] = useState<CallRecording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analysis');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [translating, setTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');

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

  const loadCallRecordings = async () => {
    if (!user) return;
    
    try {
      console.log('[CallHistory] Starting to load call recordings...');
      setLoading(true);
      const response = await fetch('/api/upload');
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
        
        setCallRecordings(audioFiles);
        if (audioFiles.length > 0) {
          console.log('[CallHistory] Setting first recording as selected:', audioFiles[0]);
          setSelectedRecording(audioFiles[0]);
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
  };

  const handleRecordingSelect = (recording: CallRecording) => {
    console.log('[CallHistory] Selecting recording:', recording);
    console.log('[CallHistory] Recording analyses:', recording.analyses);
    setSelectedRecording(recording);
  };

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
    console.log('[CallHistory] Changing tab to:', tab);
    setActiveTab(tab);
    // Clear translation when switching tabs
    if (tab !== 'transcription') {
      setTranslatedText('');
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
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-sm text-gray-900 truncate">{rec.originalName}</h3>
                      <p className="text-xs text-gray-500">{formatFileSize(rec.fileSize)} - {new Date(rec.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }} className="text-gray-400 hover:text-red-600 ml-2">
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
                  <BarChart3 className="w-4 h-4 inline-block mr-2"/>Analysis
                </button>
                <button onClick={() => handleTabChange('transcription')} className={`px-4 py-2 text-sm rounded-md ${activeTab === 'transcription' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <FileText className="w-4 h-4 inline-block mr-2"/>Transcription
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
                  console.log('[CallHistory] Selected recording analysis:', analysis);
                  console.log('[CallHistory] Analysis status:', analysis.status);
                  console.log('[CallHistory] Active tab:', activeTab);
                  
                  if (analysis.status === 'COMPLETED') {
                    if (activeTab === 'analysis') {
                      console.log('[CallHistory] Rendering analysis tab with data:', analysis.analysisResult);
                      return <AnalysisDisplay analysisResult={analysis.analysisResult} />;
                    }
                    if (activeTab === 'transcription') {
                      console.log('[CallHistory] Rendering transcription tab with data:', analysis.transcription?.substring ? analysis.transcription?.substring(0, 100) + '...' : analysis.transcription);
                      
                      // Check if transcription is a string or object
                      let transcriptionData: any = analysis.transcription;
                      if (typeof transcriptionData === 'string') {
                        try {
                          transcriptionData = JSON.parse(transcriptionData);
                        } catch (e) {
                          // If it's not valid JSON, treat as plain text
                        }
                      }
                      
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
                              
                              {/* Translation Controls */}
                              <div className="flex items-center gap-3">
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
                                    {/* If it's an object with structured data */}
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
                                        
                                        {/* Diarized conversation */}
                                        <div className="space-y-3">
                                          {transcriptionData.diarized_transcription.map((segment: any, index: number) => (
                                            <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-md">
                                              <div className="flex-shrink-0">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                  {segment.speaker}
                                                </span>
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-gray-700 leading-relaxed">
                                                  {segment.text}
                                                </p>
                                                {segment.timestamp && (
                                                  <p className="text-xs text-gray-500 mt-1">
                                                    {segment.timestamp}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          ))}
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
                              <div className="text-center py-8">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No transcription available</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  } else if (analysis.status === 'FAILED') {
                    console.log('[CallHistory] Analysis failed');
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
                  } else {
                    console.log('[CallHistory] Analysis in progress, status:', analysis.status);
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-center text-blue-600 mb-2">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin"/>
                          <h3 className="font-semibold">Analysis In Progress</h3>
                        </div>
                        <p className="text-blue-700">
                          Your call recording is being analyzed. This typically takes 5-10 minutes. Please check back later.
                        </p>
                        <button 
                          onClick={() => {
                            console.log('[CallHistory] Refreshing recordings...');
                            loadCallRecordings();
                          }}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Refresh Status
                        </button>
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
                  <p className="text-gray-600">
                    This recording has not been analyzed yet. Please upload it for analysis first.
                  </p>
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
    </div>
  );
}
