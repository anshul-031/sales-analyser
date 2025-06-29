'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Eye, EyeOff, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, Target, Lightbulb, Star, Award, MessageCircle, FileText } from 'lucide-react';
import { formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';
import Chatbot from './Chatbot';

interface AnalysisResultsProps {
  userId: string;
  analysisIds: string[];
  onRefresh?: () => void;
}

interface Analysis {
  id: string;
  status: string;
  analysisType: string;
  customPrompt?: string;
  transcription?: string;
  analysisResult?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  analysisDuration?: number;
  upload: {
    id: string;
    originalName: string;
    fileSize: number;
    uploadedAt: string;
  } | null;
}

interface TranscriptionSegment {
  speaker: string;
  text: string;
  start_time?: number;
  end_time?: number;
}

interface ParsedTranscription {
  original_language: string;
  diarized_transcription: TranscriptionSegment[];
  english_translation?: TranscriptionSegment[];
}

export default function AnalysisResults({ userId, analysisIds, onRefresh }: AnalysisResultsProps) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<{ [key: string]: 'analysis' | 'transcription' }>({});
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: { [section: string]: boolean } }>({});
  const [activeChatbot, setActiveChatbot] = useState<{ analysisId: string; uploadId: string } | null>(null);

  const fetchAnalyses = async () => {
    try {
      console.log('[AnalysisResults] Fetching analyses for user:', userId);
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({ userId });
      const response = await fetch(`/api/analyze?${queryParams}`);
      const result = await response.json();

      console.log('[AnalysisResults] Raw API response:', result);

      if (result.success) {
        let filteredAnalyses = result.analyses;
        
        // Filter by specific analysis IDs if provided
        if (analysisIds.length > 0) {
          filteredAnalyses = result.analyses.filter((analysis: Analysis) => 
            analysisIds.includes(analysis.id)
          );
        }

        // Log each analysis in detail
        filteredAnalyses.forEach((analysis: Analysis, index: number) => {
          console.log(`[AnalysisResults] Analysis #${index + 1}:`, {
            id: analysis.id,
            status: analysis.status,
            analysisType: analysis.analysisType,
            hasAnalysisResult: !!analysis.analysisResult,
            analysisResult: analysis.analysisResult
          });
        });

        setAnalyses(filteredAnalyses);
        console.log('[AnalysisResults] Fetched', filteredAnalyses.length, 'analyses');
      } else {
        setError(result.error || 'Failed to fetch analyses');
      }
    } catch (error) {
      console.error('[AnalysisResults] Fetch error:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAnalyses();
    }
  }, [userId, analysisIds]);

  // Auto-refresh for pending/processing analyses
  useEffect(() => {
    const hasPendingAnalyses = analyses.some(a => 
      a.status === 'PENDING' || a.status === 'PROCESSING'
    );

    if (hasPendingAnalyses) {
      const interval = setInterval(fetchAnalyses, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [analyses]);

  const toggleAnalysisExpansion = (analysisId: string) => {
    const isOpening = expandedAnalysis !== analysisId;
    setExpandedAnalysis(isOpening ? analysisId : null);

    // Always default to analysis view when an item is expanded
    if (isOpening) {
      setActiveView(prev => ({
        ...prev,
        [analysisId]: 'analysis'
      }));
    }
  };

  const toggleActiveView = (analysisId: string) => {
    setActiveView(prev => ({
      ...prev,
      [analysisId]: prev[analysisId] === 'transcription' ? 'analysis' : 'transcription'
    }));
  };

  const toggleSection = (analysisId: string, section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [analysisId]: {
        ...prev[analysisId],
        [section]: !prev[analysisId]?.[section]
      }
    }));
  };

  const downloadAnalysis = (analysis: Analysis) => {
    const data = {
      fileName: analysis.upload?.originalName || 'N/A',
      analysisType: analysis.analysisType,
      transcription: analysis.transcription,
      analysisResult: analysis.analysisResult,
      createdAt: analysis.createdAt,
      status: analysis.status
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${analysis.upload?.originalName || 'deleted'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseTranscription = (transcription: string | undefined): ParsedTranscription | null => {
    if (!transcription) return null;
    try {
      const parsed = JSON.parse(transcription);
      if (parsed && parsed.diarized_transcription) {
        return parsed;
      }
      return null;
    } catch (error) {
      // It might be a plain string for older analyses, so we don't log an error.
      return null;
    }
  };

  const formatTimestamp = (seconds: number) => {
    return new Date(seconds * 1000).toISOString().substr(14, 5);
  };

  const renderTranscription = (transcription: string | undefined) => {
    const parsedData = parseTranscription(transcription);

    if (!parsedData) {
      return (
        <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
          {transcription || 'No transcription available.'}
        </pre>
      );
    }

    const showTranslation = 
      parsedData.english_translation && 
      parsedData.original_language.toLowerCase() !== 'english' &&
      JSON.stringify(parsedData.diarized_transcription) !== JSON.stringify(parsedData.english_translation);

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Original Language: <span className="font-semibold uppercase">{parsedData.original_language}</span>
        </p>
        <div className={`grid ${showTranslation ? 'grid-cols-1 md:grid-cols-2 gap-6' : 'grid-cols-1'}`}>
          <div>
            {showTranslation && <h5 className="font-semibold mb-2 text-gray-700">Original Transcription</h5>}
            <div className="space-y-4 bg-white p-4 rounded-lg border">
              {parsedData.diarized_transcription.map((segment, index) => (
                <div key={index} className="text-sm flex flex-col">
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                    <span className="font-bold text-gray-800">{segment.speaker}</span>
                    {segment.start_time !== undefined && segment.end_time !== undefined && (
                      <span>
                        {formatTimestamp(segment.start_time)} - {formatTimestamp(segment.end_time)}
                      </span>
                    )}
                  </div>
                  <p className="pl-2 border-l-2 border-blue-200">{segment.text}</p>
                </div>
              ))}
            </div>
          </div>
          {showTranslation && parsedData.english_translation && (
            <div>
              <h5 className="font-semibold mb-2 text-gray-700">English Translation</h5>
              <div className="space-y-4 bg-white p-4 rounded-lg border">
                {parsedData.english_translation.map((segment, index) => (
                  <div key={index} className="text-sm flex flex-col">
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                      <span className="font-bold text-gray-800">{segment.speaker}</span>
                      {segment.start_time !== undefined && segment.end_time !== undefined && (
                        <span>
                          {formatTimestamp(segment.start_time)} - {formatTimestamp(segment.end_time)}
                        </span>
                      )}
                    </div>
                    <p className="pl-2 border-l-2 border-green-200">{segment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    if (score >= 4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) return { icon: Star, color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 6) return { icon: Award, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 4) return { icon: Target, color: 'text-orange-600', bg: 'bg-orange-100' };
    return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' };
  };

  const renderParameterCard = (key: string, param: any, analysisId: string, parameterName?: string) => {
    const badge = getScoreBadge(param.score || 0);
    const Icon = badge.icon;
    const sectionKey = `${analysisId}-${key}`;
    const isExpanded = expandedSections[analysisId]?.[key];

    // Use custom parameter name if provided, otherwise format the key
    const displayName = parameterName || key.replace(/_/g, ' ');

    return (
      <div key={key} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${badge.bg}`}>
              <Icon className={`w-5 h-5 ${badge.color}`} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-lg">
                {displayName}
              </h4>
              <p className="text-sm text-gray-500">Performance Analysis</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-lg font-bold ${getScoreColor(param.score || 0)}`}>
            {param.score || 0}/10
          </div>
        </div>
        
        <p className="text-gray-700 mb-4 leading-relaxed">{param.summary}</p>

        <div className="space-y-4">
          {/* Strengths */}
          {param.strengths && param.strengths.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h5 className="font-medium text-green-800">Strengths</h5>
              </div>
              <ul className="space-y-2">
                {param.strengths.map((strength: string, idx: number) => (
                  <li key={idx} className="flex items-start text-green-700">
                    <span className="text-green-500 mr-2 mt-1 font-bold">✓</span>
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {param.improvements && param.improvements.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <h5 className="font-medium text-orange-800">Areas for Improvement</h5>
              </div>
              <ul className="space-y-2">
                {param.improvements.map((improvement: string, idx: number) => (
                  <li key={idx} className="flex items-start text-orange-700">
                    <span className="text-orange-500 mr-2 mt-1">⚠</span>
                    <span className="text-sm">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expandable sections for detailed info */}
          {(param.specific_examples?.length > 0 || param.recommendations?.length > 0) && (
            <div className="space-y-3">
              {/* Specific Examples */}
              {param.specific_examples && param.specific_examples.length > 0 && (
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection(analysisId, `${key}-examples`)}
                    className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center rounded-t-lg"
                  >
                    <span className="font-medium text-gray-700">Specific Examples ({param.specific_examples.length})</span>
                    <span className="text-gray-400">{expandedSections[analysisId]?.[`${key}-examples`] ? '−' : '+'}</span>
                  </button>
                  
                  {expandedSections[analysisId]?.[`${key}-examples`] && (
                    <div className="border-t border-gray-200 p-4 bg-blue-50">
                      <ul className="space-y-3">
                        {param.specific_examples.map((example: string, idx: number) => (
                          <li key={idx} className="text-sm text-blue-800 leading-relaxed">
                            <span className="font-medium">Example {idx + 1}:</span> {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {param.recommendations && param.recommendations.length > 0 && (
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSection(analysisId, `${key}-recommendations`)}
                    className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center rounded-t-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-gray-700">Recommendations ({param.recommendations.length})</span>
                    </div>
                    <span className="text-gray-400">{expandedSections[analysisId]?.[`${key}-recommendations`] ? '−' : '+'}</span>
                  </button>
                  
                  {expandedSections[analysisId]?.[`${key}-recommendations`] && (
                    <div className="border-t border-gray-200 p-4 bg-purple-50">
                      <ul className="space-y-3">
                        {param.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start text-purple-800">
                            <span className="text-purple-600 mr-2 mt-1">💡</span>
                            <span className="text-sm leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDefaultAnalysisResult = (result: any, analysisId: string) => {
    console.log('[AnalysisResults] Rendering default analysis:', { result, analysisId });

    if (!result) {
      console.error('[AnalysisResults] renderDefaultAnalysisResult: received null result');
      return <p className="text-red-500">Could not load analysis result.</p>;
    }

    console.log('[AnalysisResults] Result keys:', Object.keys(result));
    console.log('[AnalysisResults] Looking for parameters in result...');
    
    const parameters = result.parameters;
    if (!parameters) {
      console.error('[AnalysisResults] renderDefaultAnalysisResult: no parameters property found in result', { result });
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className="text-orange-600">No analysis parameters were found in the result.</p>
          <p className="text-sm text-gray-500 mt-2">Expected: result.parameters</p>
          <p className="text-sm text-gray-500">Available keys: {Object.keys(result).join(', ')}</p>
        </div>
      );
    }
    
    if (Object.keys(parameters).length === 0) {
      console.error('[AnalysisResults] renderDefaultAnalysisResult: parameters object is empty', { parameters });
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <p className="text-orange-600">Analysis parameters object is empty.</p>
        </div>
      );
    }

    console.log('[AnalysisResults] Rendering parameters:', parameters);
    console.log('[AnalysisResults] Parameter keys:', Object.keys(parameters));

    return (
      <div className="space-y-8">
        {/* Overall Score with visual indicator */}
        <div className="text-center p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl border border-gray-200">
          <div className="inline-flex items-center justify-center space-x-4">
            <div className="text-5xl font-bold text-gray-800">{result.overallScore || 0}</div>
            <div className="text-xl text-gray-600">/10</div>
          </div>
          <div className="text-lg text-gray-600 mt-2">Overall Performance Score</div>
          <div className="text-sm text-gray-500 mt-1">
            Analysis completed on {new Date(result.analysisDate).toLocaleDateString()}
          </div>
        </div>

        {/* Parameter Results in a grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(parameters).map(([key, param]: [string, any]) =>
            renderParameterCard(key, param, analysisId, result.parameterNames?.[key])
          )}
        </div>

        {/* Summary insights */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            Key Performance Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(parameters).filter((p: any) => p.score >= 7).length}
              </div>
              <div className="text-sm text-gray-600">Strong Areas</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(parameters).filter((p: any) => p.score >= 4 && p.score < 7).length}
              </div>
              <div className="text-sm text-gray-600">Areas to Improve</div>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(parameters).filter((p: any) => p.score < 4).length}
              </div>
              <div className="text-sm text-gray-600">Priority Focus</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomAnalysisResult = (result: any) => {
    if (!result || !result.result) return null;

    const analysisData = result.result;

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        {result.overallScore > 0 && (
          <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
            <div className="text-4xl font-bold text-gray-800">{result.overallScore}/10</div>
            <div className="text-lg text-gray-600 mt-2">Overall Score</div>
          </div>
        )}

        {/* Summary */}
        {analysisData.summary && (
          <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
            <h4 className="font-semibold text-gray-800 mb-3 text-lg">Executive Summary</h4>
            <p className="text-gray-700 leading-relaxed">{analysisData.summary}</p>
          </div>
        )}

        {/* Key Findings */}
        {analysisData.key_findings && analysisData.key_findings.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-6 bg-green-50">
            <h4 className="font-semibold text-gray-800 mb-4 text-lg flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Key Findings
            </h4>
            <div className="grid gap-3">
              {analysisData.key_findings.map((finding: string, idx: number) => (
                <div key={idx} className="flex items-start text-gray-700 p-3 bg-white rounded-lg">
                  <span className="text-green-500 mr-3 mt-1 font-bold">{idx + 1}</span>
                  <span className="leading-relaxed">{finding}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scores */}
        {analysisData.scores && Object.keys(analysisData.scores).length > 0 && (
          <div className="border border-gray-200 rounded-xl p-6">
            <h4 className="font-semibold text-gray-800 mb-4 text-lg">Detailed Scores</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(analysisData.scores).map(([aspect, score]: [string, any]) => (
                <div key={aspect} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border">
                  <span className="text-gray-700 capitalize font-medium">
                    {aspect.replace(/_/g, ' ')}
                  </span>
                  <span className={`font-bold px-3 py-1 rounded-full ${getScoreColor(score)}`}>
                    {score}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysisData.recommendations && analysisData.recommendations.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-6 bg-purple-50">
            <h4 className="font-semibold text-gray-800 mb-4 text-lg flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-purple-600" />
              Recommendations
            </h4>
            <div className="space-y-3">
              {analysisData.recommendations.map((rec: string, idx: number) => (
                <div key={idx} className="flex items-start text-gray-700 p-3 bg-white rounded-lg">
                  <span className="text-purple-600 mr-3 mt-1">💡</span>
                  <span className="leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mr-3" />
          <span className="text-gray-600 text-lg">Loading analyses...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">Error Loading Analyses</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchAnalyses}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Analyses Found</h3>
          <p className="text-gray-500">Start by uploading files and configuring analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Analysis Results</h2>
          <p className="text-gray-600 mt-1">Detailed AI-powered sales call performance analysis</p>
        </div>
        <button
          onClick={fetchAnalyses}
          className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-6">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            {/* Analysis Header */}
            <div
              className="p-6 cursor-pointer hover:bg-gray-50 rounded-t-xl"
              onClick={() => toggleAnalysisExpansion(analysis.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(analysis.status)}`}>
                      {getStatusIcon(analysis.status)} {analysis.status}
                    </span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {analysis.analysisType === 'custom' ? 'Custom Analysis' : 'Comprehensive Analysis'}
                    </span>
                    {analysis.status === 'COMPLETED' && analysis.analysisResult && (
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(analysis.analysisResult.overallScore || 0)}`}>
                        Score: {analysis.analysisResult.overallScore || 'N/A'}/10
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                    {analysis.upload?.originalName || 'Original file deleted'}
                  </h3>
                  
                  <p className="text-sm text-gray-600">
                    Created: {formatDate(new Date(analysis.createdAt))} •
                    File size: {analysis.upload ? Math.round(analysis.upload.fileSize / 1024) : 'Unknown'} KB
                    {analysis.analysisDuration && (
                      <span className="text-gray-500">
                        {' • '}
                        <span className="font-semibold">Analysis Time:</span> {(analysis.analysisDuration / 1000).toFixed(2)}s
                      </span>
                    )}
                  </p>

                  {analysis.errorMessage && (
                    <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded">
                      Error: {analysis.errorMessage}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {analysis.status === 'COMPLETED' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (analysis.upload) {
                            setActiveChatbot({
                              analysisId: analysis.id,
                              uploadId: analysis.upload.id
                            });
                          }
                        }}
                        disabled={!analysis.upload}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Ask AI about this analysis"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAnalysis(analysis);
                        }}
                        disabled={!analysis.upload}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Analysis"
                      >
                        <Download className="w-5 h-5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActiveView(analysis.id);
                        }}
                        disabled={!analysis.transcription}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={activeView[analysis.id] === 'transcription' ? "View Analysis" : "View Transcription"}
                      >
                        {activeView[analysis.id] === 'transcription' ? <FileText className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                  
                  <div className="text-gray-400 text-xl">
                    {expandedAnalysis === analysis.id ? '−' : '+'}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Analysis Content */}
            {expandedAnalysis === analysis.id && (
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                {analysis.status === 'PROCESSING' && (
                  <div className="text-center py-12">
                    <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Analysis in progress...</p>
                    <p className="text-gray-500 text-sm mt-2">This may take a few minutes</p>
                  </div>
                )}

                {analysis.status === 'FAILED' && (
                  <div className="text-center py-12">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 text-lg font-medium">Analysis failed</p>
                    {analysis.errorMessage && (
                      <p className="text-gray-600 mt-2">{analysis.errorMessage}</p>
                    )}
                  </div>
                )}

                {analysis.status === 'COMPLETED' && (
                  activeView[analysis.id] === 'transcription' ? (
                    <div className="max-h-[30rem] overflow-y-auto p-1">
                      {renderTranscription(analysis.transcription)}
                    </div>
                  ) : (
                    (() => {
                      console.log('[AnalysisResults] Rendering analysis section for:', analysis.id, {
                        hasAnalysisResult: !!analysis.analysisResult,
                        analysisType: analysis.analysisType,
                        analysisResult: analysis.analysisResult
                      });
                      
                      if (!analysis.analysisResult) {
                        return (
                          <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No analysis data available.</p>
                            <p className="text-sm text-gray-400 mt-2">Analysis result is missing or empty.</p>
                          </div>
                        );
                      }

                      console.log('[AnalysisResults] About to render analysis based on type:', analysis.analysisType);
                      
                      return (
                        <div className="space-y-8">
                          {/* Custom Prompt Display */}
                          {analysis.analysisType === 'custom' && analysis.customPrompt && (
                            <div className="border border-purple-200 rounded-xl p-6 bg-purple-50">
                              <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                                <Target className="w-5 h-5 mr-2" />
                                Custom Analysis Instructions
                              </h4>
                              <p className="text-purple-700 leading-relaxed">{analysis.customPrompt}</p>
                            </div>
                          )}

                          {/* Analysis Results */}
                          {(analysis.analysisType === 'default' || 
                            analysis.analysisType === 'parameters' || 
                            analysis.analysisType === 'PARAMETERS')
                            ? renderDefaultAnalysisResult(analysis.analysisResult, analysis.id)
                            : renderCustomAnalysisResult(analysis.analysisResult)
                          }
                        </div>
                      );
                    })()
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Chatbot for specific analysis */}
      {activeChatbot && (
        <Chatbot
          userId={userId}
          analysisId={activeChatbot.analysisId}
          uploadId={activeChatbot.uploadId}
          onClose={() => setActiveChatbot(null)}
        />
      )}
    </div>
  );
}