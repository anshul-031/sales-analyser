'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Upload, FileText, User, Zap, MessageCircle, Settings } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import AnalysisResults from '@/components/AnalysisResults';
import Chatbot from '@/components/Chatbot';
import { Logger } from '@/lib/utils';

// Simulate user authentication for demo purposes
const DEMO_USER_ID = 'demo-user-001';

enum AppStep {
  UPLOAD = 'upload',
  RESULTS = 'results'
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; originalName: string; uploadedAt: string; [key: string]: unknown }>>([]);
  const [analysisIds, setAnalysisIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  // Load uploaded files on component mount
  useEffect(() => {
    loadUploadedFiles();
  }, []);

  const loadUploadedFiles = async () => {
    try {
      Logger.info('[HomePage] Loading uploaded files for user:', DEMO_USER_ID);
      setLoading(true);
      
      const response = await fetch(`/api/upload?userId=${DEMO_USER_ID}`);
      const result = await response.json();
      
      if (result.success) {
        setUploadedFiles(result.uploads || []);
        Logger.info('[HomePage] Loaded', result.uploads?.length || 0, 'uploaded files');
      } else {
        console.error('[HomePage] Failed to load uploads:', result.error);
      }
    } catch (error) {
      console.error('[HomePage] Error loading uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (response: unknown) => {
    Logger.info('[HomePage] Upload completed:', response);
    
    // Type guard for response
    const uploadResponse = response as {
      analysisStarted?: boolean;
      analyses?: Array<{ id: string }>;
      results?: Array<{
        success: boolean;
        id?: string;
        originalName?: string;
        uploadedAt?: string;
        [key: string]: unknown
      }>;
    };
    
    // If analysis was auto-started, extract the analysis IDs and go to results
    if (uploadResponse.analysisStarted && uploadResponse.analyses) {
      const newAnalysisIds = uploadResponse.analyses.map((a) => a.id);
      Logger.info('[HomePage] Auto-analysis started, going to results with', newAnalysisIds.length, 'analyses');
      setAnalysisIds(prev => [...newAnalysisIds, ...prev]);
      setCurrentStep(AppStep.RESULTS);
    } else if (uploadResponse.results) {
      // Just update uploaded files - no configuration step needed
      const successfulFiles = uploadResponse.results.filter((r) => r.success && r.id && r.originalName && r.uploadedAt);
      const newFiles = successfulFiles as Array<{ id: string; originalName: string; uploadedAt: string; [key: string]: unknown }>;
      setUploadedFiles(prev => [...newFiles, ...prev]);
      // Files uploaded but no auto-analysis, stay on upload step
    }
    
    // Reload uploaded files to get the latest state
    loadUploadedFiles();
  };

  const handleAnalysisStart = (newAnalysisIds: string[]) => {
    Logger.info('[HomePage] Analysis started for', newAnalysisIds.length, 'files');
    setAnalysisIds(prev => [...newAnalysisIds, ...prev]);
    setCurrentStep(AppStep.RESULTS);
  };

  const getStepStatus = (step: AppStep) => {
    if (step === currentStep) return 'current';
    
    switch (step) {
      case AppStep.UPLOAD:
        return uploadedFiles.length > 0 ? 'completed' : 'pending';
      case AppStep.RESULTS:
        return analysisIds.length > 0 ? 'available' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStepClasses = (step: AppStep) => {
    const status = getStepStatus(step);
    const isClickable = status === 'completed' || status === 'available' || status === 'current';
    
    let classes = 'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ';
    
    if (status === 'current') {
      classes += 'bg-blue-600 text-white shadow-lg';
    } else if (status === 'completed') {
      classes += 'bg-green-100 text-green-800 hover:bg-green-200';
    } else if (status === 'available') {
      classes += 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    } else {
      classes += 'bg-gray-50 text-gray-400';
    }
    
    if (isClickable) {
      classes += ' cursor-pointer';
    } else {
      classes += ' cursor-not-allowed';
    }
    
    return classes;
  };

  const handleStepClick = (step: AppStep) => {
    const status = getStepStatus(step);
    if (status === 'completed' || status === 'available' || status === 'current') {
      setCurrentStep(step);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case AppStep.UPLOAD:
        return (
          <FileUpload
            onUploadComplete={handleUploadComplete}
            userId={DEMO_USER_ID}
            maxFiles={10}
            maxFileSize={50 * 1024 * 1024}
          />
        );
      
      case AppStep.RESULTS:
        return (
          <AnalysisResults
            userId={DEMO_USER_ID}
            analysisIds={analysisIds}
            onRefresh={loadUploadedFiles}
          />
        );
      
      default:
        return null;
    }
  };

  const shouldShowChatbot = () => {
    // Show chatbot only if there are completed analyses
    return analysisIds.length > 0 || uploadedFiles.length > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Chatbot */}
      {showChatbot && (
        <Chatbot
          userId={DEMO_USER_ID}
          onClose={() => setShowChatbot(false)}
        />
      )}
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sales Performance Analyzer</h1>
                <p className="text-sm text-gray-500">AI-powered sales call analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>Demo User</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Process Steps */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => handleStepClick(AppStep.UPLOAD)}
              className={getStepClasses(AppStep.UPLOAD)}
            >
              <Upload className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">Upload Files</div>
                <div className="text-xs opacity-75">
                  {uploadedFiles.length > 0 ? `${uploadedFiles.length} files uploaded` : 'Upload audio recordings'}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleStepClick(AppStep.RESULTS)}
              className={getStepClasses(AppStep.RESULTS)}
            >
              <FileText className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">View Results</div>
                <div className="text-xs opacity-75">
                  {analysisIds.length > 0 ? `${analysisIds.length} analyses` : 'Analysis results'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : (
            renderStepContent()
          )}
        </div>

        {/* Chatbot Toggle Button */}
        {shouldShowChatbot() && !showChatbot && (
          <div className="fixed bottom-4 right-4 z-40">
            <button
              onClick={() => setShowChatbot(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors group"
              title="Open AI Assistant"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                AI
              </span>
            </button>
          </div>
        )}

        {/* Features Section */}
        {currentStep === AppStep.UPLOAD && uploadedFiles.length === 0 && (
          <div className="mt-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Powerful Sales Call Analysis Features
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Upload your sales call recordings and get detailed AI-powered insights to improve your team&apos;s performance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Transcription</h3>
                <p className="text-sm text-gray-600">
                  Automatic speech-to-text conversion with high accuracy using Google Gemini
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Performance Scoring</h3>
                <p className="text-sm text-gray-600">
                  Comprehensive scoring across multiple sales performance criteria
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Custom Analysis</h3>
                <p className="text-sm text-gray-600">
                  Define your own analysis criteria or use our proven framework
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Detailed Reports</h3>
                <p className="text-sm text-gray-600">
                  Get actionable insights with strengths, improvements, and recommendations
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Chat Assistant</h3>
                <p className="text-sm text-gray-600">
                  Ask questions about your call recordings and get personalized insights
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="text-sm">
              Sales Performance Analyzer - Powered by Google Gemini AI
            </p>
            <p className="text-xs mt-2">
              Upload audio files, configure analysis parameters, and get detailed insights to improve sales performance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
