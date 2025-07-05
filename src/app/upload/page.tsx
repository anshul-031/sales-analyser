'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Upload, FileText, User, Zap, MessageCircle, Settings } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import AnalysisResults from '@/components/AnalysisResults';
import Chatbot from '@/components/Chatbot';
import { Logger } from '@/lib/utils';
import { MAX_FILE_SIZE, MAX_FILES } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

enum AppStep {
  UPLOAD = 'upload',
  RESULTS = 'results'
}

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; originalName: string; uploadedAt: string; [key: string]: unknown }>>([]);
  const [analysisIds, setAnalysisIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [filesUploading, setFilesUploading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load uploaded files on component mount
  useEffect(() => {
    if (user && !authLoading) {
      loadUploadedFiles();
    }
  }, [user, authLoading]);

  const loadUploadedFiles = async () => {
    if (!user) return;
    
    try {
      Logger.info('[UploadPage] Loading uploaded files for user:', user.id);
      setLoading(true);
      
      const response = await fetch('/api/upload');
      const result = await response.json();
      
      if (result.success) {
        setUploadedFiles(result.uploads || []);
        Logger.info('[UploadPage] Loaded', result.uploads?.length || 0, 'uploaded files');
      } else {
        console.error('[UploadPage] Failed to load uploads:', result.error);
      }
    } catch (error) {
      console.error('[UploadPage] Error loading uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadsStart = () => {
    setFilesUploading(true);
  };

  const handleFileUploadComplete = (result: { success: boolean; file: any; analysisId?: string }) => {
    // File upload completion is now handled entirely by the FileUpload component
    // We don't need to track individual file statuses here anymore to prevent unnecessary re-renders
    // The FileUpload component manages its own state and calls handleAllUploadsComplete when done
  };

  const handleAllUploadsComplete = (response: unknown) => {
    console.log('[UploadPage] === UPLOADS COMPLETE CALLBACK ===');
    console.log('[UploadPage] Response received:', JSON.stringify(response, null, 2));
    console.log('[UploadPage] Response type:', typeof response);
    console.log('[UploadPage] User authenticated:', !!user);
    console.log('[UploadPage] Router available:', !!router);
    
    setFilesUploading(false);
    Logger.info('[UploadPage] All uploads completed:', response);

    const uploadResponse = response as {
      analysisStarted?: boolean;
      analyses?: Array<{ id: string }>;
      error?: string;
      redirectAnyway?: boolean;
    };

    console.log('[UploadPage] Parsed response - analysisStarted:', uploadResponse.analysisStarted);
    console.log('[UploadPage] Parsed response - analyses:', uploadResponse.analyses);
    console.log('[UploadPage] Analyses is array:', Array.isArray(uploadResponse.analyses));
    console.log('[UploadPage] Analyses length:', uploadResponse.analyses?.length);

    // More robust condition checking
    const shouldRedirect = (uploadResponse.analysisStarted === true && 
                           Array.isArray(uploadResponse.analyses) &&
                           uploadResponse.analyses.length > 0) ||
                          uploadResponse.redirectAnyway === true;
    
    console.log('[UploadPage] Should redirect:', shouldRedirect);
    console.log('[UploadPage] Redirect anyway flag:', uploadResponse.redirectAnyway);

    if (shouldRedirect) {
      const newAnalysisIds = (uploadResponse.analyses || []).map((a) => a.id).filter(id => id);
      console.log('[UploadPage] Analysis IDs extracted:', newAnalysisIds);
      
      if (uploadResponse.analysisStarted) {
        Logger.info('[UploadPage] Auto-analysis started, redirecting to history with', newAnalysisIds.length, 'analyses');
        setAnalysisIds(prev => [...newAnalysisIds, ...prev]);
        
        console.log('[UploadPage] Showing success toast notification...');
        toast.success("Analysis started! Redirecting to call history page...", {
          duration: 2500,
        });
      } else {
        Logger.info('[UploadPage] Files uploaded but analysis failed, redirecting to history anyway');
        
        console.log('[UploadPage] Showing error toast notification...');
        const errorMsg = uploadResponse.error || 'Analysis failed to start';
        toast.error(`Files uploaded successfully, but ${errorMsg}. Redirecting to call history...`, {
          duration: 2500,
        });
      }
      
      console.log('[UploadPage] Setting timeout for redirection...');
      
      // Use a consistent shorter delay for better UX
      const redirectDelay = 1500; // 1.5 seconds - enough time to see the toast
      console.log('[UploadPage] Redirect delay set to:', redirectDelay, 'ms');
      
      // Show loading state during redirection
      setIsRedirecting(true);
      
      setTimeout(() => {
        console.log('[UploadPage] EXECUTING REDIRECTION TO CALL HISTORY');
        console.log('[UploadPage] Current location:', window.location.href);
        console.log('[UploadPage] Router object available:', !!router);
        console.log('[UploadPage] User still authenticated:', !!user);
        
        try {
          console.log('[UploadPage] Attempting router.push("/call-history")...');
          router.push('/call-history');
          console.log('[UploadPage] ✅ Router.push() executed successfully');
          
          // Add a small delay to verify the navigation worked
          setTimeout(() => {
            console.log('[UploadPage] Post-redirect location check:', window.location.href);
            if (!window.location.href.includes('/call-history')) {
              console.warn('[UploadPage] Router navigation may have failed, using fallback...');
              window.location.href = '/call-history';
            }
            setIsRedirecting(false); // Reset state in case navigation failed
          }, 100);
          
        } catch (error) {
          console.error('[UploadPage] ❌ Router.push() failed:', error);
          console.log('[UploadPage] Attempting fallback redirection using window.location...');
          try {
            window.location.href = '/call-history';
            console.log('[UploadPage] ✅ Fallback redirection executed');
          } catch (fallbackError) {
            console.error('[UploadPage] ❌ Fallback redirection also failed:', fallbackError);
            setIsRedirecting(false); // Reset state if all fails
          }
        }
      }, redirectDelay);
    } else {
      console.log('[UploadPage] NOT redirecting - Reasons:');
      console.log('[UploadPage] - analysisStarted:', uploadResponse.analysisStarted, '(should be true)');
      console.log('[UploadPage] - analyses is array:', Array.isArray(uploadResponse.analyses), '(should be true)');
      console.log('[UploadPage] - analyses length:', uploadResponse.analyses?.length, '(should be > 0)');
      console.log('[UploadPage] - analyses value:', uploadResponse.analyses);
      console.log('[UploadPage] - redirectAnyway:', uploadResponse.redirectAnyway, '(fallback flag)');
      console.log('[UploadPage] - error:', uploadResponse.error);
    }
    
    // No need to reload files here - optimization to prevent unnecessary re-renders
    // The FileUpload component handles the file state updates internally
    console.log('[UploadPage] Skipping file reload to prevent unnecessary re-renders');
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
          <div>
            <FileUpload
              onUploadsStart={handleUploadsStart}
              onUploadComplete={handleFileUploadComplete}
              onUploadsComplete={handleAllUploadsComplete}
              userId={user?.id || ''}
              maxFiles={MAX_FILES}
              maxFileSize={MAX_FILE_SIZE}
            />
            
            {/* Manual redirect button for testing/fallback */}
            {uploadedFiles.length > 0 && !isRedirecting && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">Files Uploaded Successfully</h3>
                    <p className="text-sm text-blue-700">
                      {uploadedFiles.length} file(s) uploaded. You can view them in your call history.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      console.log('[UploadPage] Manual redirect button clicked');
                      setIsRedirecting(true);
                      toast.success("Redirecting to call history...");
                      setTimeout(() => {
                        try {
                          router.push('/call-history');
                        } catch (error) {
                          window.location.href = '/call-history';
                        }
                      }, 500);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    View Call History
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
      case AppStep.RESULTS:
        return (
          <AnalysisResults
            userId={user?.id || ''}
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

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster richColors position="top-center" />
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload & Analyze</h1>
              <p className="text-gray-600">Upload your call recordings and get AI-powered analysis</p>
            </div>
            <div className="hidden md:flex md:space-x-4">
              <button
                onClick={() => router.push('/account')}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <User className="w-5 h-5" />
                <span>Account</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chatbot */}
      {showChatbot && (
        <Chatbot
          userId={user?.id || ''}
          onClose={() => setShowChatbot(false)}
        />
      )}
      
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

        {/* Redirection Overlay */}
        {isRedirecting && (
          <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Redirecting to Call History</h3>
              <p className="text-gray-600">Please wait while we take you to your uploaded files...</p>
            </div>
          </div>
        )}

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
                Powerful Call Analysis Features
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
    </div>
  );
}
