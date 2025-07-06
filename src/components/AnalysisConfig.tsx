'use client';

import React, { useState } from 'react';
import { Play, Settings, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { DEFAULT_ANALYSIS_PARAMETERS } from '@/lib/analysis-constants';

interface AnalysisConfigProps {
  uploadedFiles: Array<{ id: string; originalName: string; uploadedAt: string }>;
  userId: string;
  onAnalysisStart: (analysisIds: string[]) => void;
}

export default function AnalysisConfig({ uploadedFiles, userId, onAnalysisStart }: AnalysisConfigProps) {
  const [analysisType, setAnalysisType] = useState<'default' | 'custom'>('default');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedParameter, setExpandedParameter] = useState<string | null>(null);

  const handleFileSelection = (fileId: string) => {
    // Only handle valid file IDs
    if (!fileId || typeof fileId !== 'string' || fileId.trim().length === 0) {
      console.warn('[AnalysisConfig] Invalid file ID:', fileId);
      return;
    }
    
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(uploadedFiles.map(file => file.id).filter(id => id && typeof id === 'string'));
  };

  const deselectAllFiles = () => {
    setSelectedFiles([]);
  };

  const startAnalysis = async () => {
    console.log('[AnalysisConfig] Starting analysis process');
    
    // Filter out any null or invalid IDs from selectedFiles
    const validSelectedFiles = selectedFiles.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    
    if (validSelectedFiles.length === 0) {
      setError('Please select at least one file to analyze');
      return;
    }

    if (analysisType === 'custom' && !customPrompt.trim()) {
      setError('Please provide custom analysis instructions');
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const requestBody = {
        uploadIds: validSelectedFiles,
        analysisType,
        customPrompt: analysisType === 'custom' ? customPrompt : undefined
      };

      console.log('[AnalysisConfig] Sending analysis request:', requestBody);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('[AnalysisConfig] Analysis response:', result);

      if (result.success) {
        const analysisIds = (result.results as Array<{ success: boolean; analysisId?: string }>)
          .filter((r) => r.success && r.analysisId)
          .map((r) => r.analysisId!);
        
        onAnalysisStart(analysisIds);
        
        // Reset form
        setSelectedFiles([]);
        setCustomPrompt('');
        setAnalysisType('default');
        
        console.log('[AnalysisConfig] Analysis started successfully for', analysisIds.length, 'files');
      } else {
        setError(result.error || 'Analysis request failed');
        console.error('[AnalysisConfig] Analysis request failed:', result.error);
      }
    } catch (error) {
      console.error('[AnalysisConfig] Analysis error:', error);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedFilesCount = selectedFiles.length;
  const hasUploadedFiles = uploadedFiles.length > 0;

  if (!hasUploadedFiles) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Files Uploaded</h3>
          <p className="text-gray-500">Upload audio files first to start analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Settings className="w-6 h-6 mr-2" />
        Configure Analysis
      </h2>

      {/* File Selection */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Select Files to Analyze ({selectedFilesCount}/{uploadedFiles.length})
          </h3>
          <div className="space-x-2">
            <button
              onClick={selectAllFiles}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={deselectAllFiles}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Deselect All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
          {uploadedFiles.map((file) => (
            <label
              key={file.id}
              className={`
                flex items-center p-3 rounded-lg border cursor-pointer transition-colors
                ${selectedFiles.includes(file.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="checkbox"
                checked={selectedFiles.includes(file.id)}
                onChange={() => handleFileSelection(file.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.originalName}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Analysis Type Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Analysis Type</h3>
        
        <div className="space-y-4">
          {/* Default Analysis */}
          <label className={`
            flex items-start p-4 rounded-lg border cursor-pointer transition-colors
            ${analysisType === 'default'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
            }
          `}>
            <input
              type="radio"
              name="analysisType"
              value="default"
              checked={analysisType === 'default'}
              onChange={(e) => setAnalysisType(e.target.value as 'default' | 'custom')}
              className="w-4 h-4 text-blue-600 mt-1"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
                <span className="font-medium text-gray-700">Comprehensive Call Analysis</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Analyze using our proven sales performance framework covering all key areas
              </p>
              
              {/* Default Parameters Preview */}
              {analysisType === 'default' && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-600">Analysis includes:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(DEFAULT_ANALYSIS_PARAMETERS).map(([key, param]) => (
                      <div key={key}>
                        <button
                          onClick={() => setExpandedParameter(expandedParameter === key ? null : key)}
                          className="text-xs text-blue-600 hover:text-blue-800 text-left"
                        >
                          • {param.name}
                        </button>
                        {expandedParameter === key && (
                          <div className="mt-1 p-2 bg-white rounded border text-xs text-gray-600">
                            {param.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </label>

          {/* Custom Analysis */}
          <label className={`
            flex items-start p-4 rounded-lg border cursor-pointer transition-colors
            ${analysisType === 'custom'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
            }
          `}>
            <input
              type="radio"
              name="analysisType"
              value="custom"
              checked={analysisType === 'custom'}
              onChange={(e) => setAnalysisType(e.target.value as 'default' | 'custom')}
              className="w-4 h-4 text-blue-600 mt-1"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-purple-500 mr-2" />
                <span className="font-medium text-gray-700">Custom Analysis</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Provide your own analysis criteria and instructions
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Custom Prompt Input */}
      {analysisType === 'custom' && (
        <div className="mb-6">
          <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Analysis Instructions
          </label>
          <textarea
            id="customPrompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe how you want the sales call to be analyzed. For example:
- Focus on objection handling techniques
- Evaluate product presentation skills
- Assess customer engagement levels
- Analyze closing effectiveness..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Provide detailed instructions for what aspects of the sales call you want analyzed
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Start Analysis Button */}
      <div className="flex justify-end">
        <button
          onClick={startAnalysis}
          disabled={isAnalyzing || selectedFilesCount === 0}
          className={`
            px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2
            ${isAnalyzing || selectedFilesCount === 0
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Starting Analysis...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>
                Analyze {selectedFilesCount} File{selectedFilesCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}