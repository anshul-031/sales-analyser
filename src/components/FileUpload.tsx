'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, FileAudio, AlertCircle, CheckCircle, Target, Edit3, Save, Plus, ChevronDown, ChevronUp, Loader2, Wind, Zap, Settings } from 'lucide-react';
import { formatFileSize, isValidAudioFile } from '@/lib/utils';
import { DEFAULT_ANALYSIS_PARAMETERS } from '@/lib/analysis-constants';
import { MAX_FILE_SIZE, MAX_FILES, CHUNK_SIZE } from '@/lib/constants';
import { 
  audioCompressor, 
  COMPRESSION_PRESETS, 
  CompressionSettings, 
  AudioCompressor 
} from '@/lib/audio-compression';

interface FileUploadProps {
  onUploadsStart: () => void;
  onUploadComplete: (result: { success: boolean; file: UploadFile; analysisId?: string }) => void;
  onUploadsComplete: (response: unknown) => void;
  userId: string;
  maxFiles?: number;
  maxFileSize?: number;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  uploadId?: string;
  compressedSize?: number;
  compressionTime?: number;
  isPaused?: boolean;
  uploadDuration?: number;
  compressionRatio?: number;
  audioCompressionUsed?: boolean;
  originalAudioSize?: number;
  analysisTriggered?: boolean;
  analysisId?: string;
}

export default function FileUpload({
  onUploadsStart,
  onUploadComplete,
  onUploadsComplete,
  userId,
  maxFiles = MAX_FILES,
  maxFileSize = MAX_FILE_SIZE
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [analysisParameters, setAnalysisParameters] = useState(() =>
    Object.entries(DEFAULT_ANALYSIS_PARAMETERS).map(([key, param]) => ({
      id: key,
      name: param.name,
      description: param.description,
      prompt: param.prompt,
      enabled: true
    }))
  );
  const [showParameterDetails, setShowParameterDetails] = useState(false);
  const [editingParameter, setEditingParameter] = useState<string | null>(null);
  const [compressionSettings, setCompressionSettings] = useState<keyof typeof COMPRESSION_PRESETS>('MAXIMUM');
  const [enableAudioCompression, setEnableAudioCompression] = useState(true);
  const [showCompressionSettings, setShowCompressionSettings] = useState(false);

  const handleParameterToggle = (id: string) => {
    setAnalysisParameters(prev =>
      prev.map(param =>
        param.id === id ? { ...param, enabled: !param.enabled } : param
      )
    );
  };

  const handleParameterEdit = (id: string, updates: Partial<typeof analysisParameters[0]>) => {
    setAnalysisParameters(prev =>
      prev.map(param =>
        param.id === id ? { ...param, ...updates } : param
      )
    );
    setEditingParameter(null);
  };

  const addNewParameter = () => {
    const newParam = {
      id: `custom_${Date.now()}`,
      name: 'New Analysis Parameter',
      description: 'Custom analysis criteria',
      prompt: 'Analyze this aspect of the sales call...',
      enabled: true
    };
    setAnalysisParameters(prev => [...prev, newParam]);
    setEditingParameter(newParam.id);
  };

  const removeParameter = (id: string) => {
    setAnalysisParameters(prev => prev.filter(param => param.id !== id));
  };

  // Utility function to format file names for display
  const formatFileName = (fileName: string, maxLength: number = 60) => {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExtension.substring(0, maxLength - extension.length - 3) + '...';
    
    return truncatedName + extension;
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    console.log('[FileUpload] Files dropped:', { accepted: acceptedFiles.length, rejected: rejectedFiles.length });

    // Clear previous error messages
    setErrorMessages([]);

    // Handle rejected files with user-friendly error messages
    if (rejectedFiles.length > 0) {
      console.warn('[FileUpload] Rejected files:', rejectedFiles);
      
      const errors: string[] = [];
      rejectedFiles.forEach(({ file, errors: fileErrors }) => {
        fileErrors.forEach(error => {
          if (error.code === 'file-too-large') {
            errors.push(`"${file.name}" is too large. Maximum file size is ${formatFileSize(maxFileSize)}.`);
          } else if (error.code === 'file-invalid-type') {
            errors.push(`"${file.name}" has an invalid file type. Please upload audio files only (MP3, WAV, M4A, AAC, OGG, FLAC, WebM).`);
          } else if (error.code === 'too-many-files') {
            errors.push(`Too many files selected. Maximum ${maxFiles} files allowed.`);
          } else {
            errors.push(`"${file.name}" was rejected: ${error.message}`);
          }
        });
      });
      
      setErrorMessages(errors);
    }

    // Add accepted files to the list
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const
    }));

    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      if (combined.length > maxFiles) {
        console.warn(`[FileUpload] Too many files. Limit: ${maxFiles}`);
        setErrorMessages(prev => [...prev, `Too many files selected. Only the first ${maxFiles} files will be kept.`]);
        return combined.slice(0, maxFiles);
      }
      return combined;
    });
  }, [maxFiles, maxFileSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm']
    },
    maxFiles,
    maxSize: maxFileSize,
    multiple: true
  });

  const removeFile = (id: string) => {
    console.log('[FileUpload] Removing file:', id);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadAllFiles = async () => {
    if (files.filter(f => f.status === 'pending').length === 0) {
      console.log('[FileUpload] No files to upload.');
      return;
    }

    console.log('[FileUpload] === STARTING UPLOAD PROCESS ===');
    console.log('[FileUpload] Files to upload:', files.filter(f => f.status === 'pending').length);

    setIsUploading(true);
    onUploadsStart();
    setErrorMessages([]);

    // Process files one by one to prevent memory issues
    const filesToUpload = files.filter(f => f.status === 'pending');
    const results = [];

    for (const file of filesToUpload) {
      console.log('[FileUpload] Processing file:', file.file.name);
      const result = await uploadFile(file);
      results.push(result);
      
      // Small delay between uploads to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[FileUpload] All uploads completed:', results.map(r => ({ success: r.success, uploadId: r.uploadId, error: r.error })));

    setIsUploading(false);

    // Add detailed logging for filtering logic
    console.log('[FileUpload] Filtering results for successful uploads with valid IDs...');
    results.forEach((result, index) => {
      console.log(`[FileUpload] Result ${index}:`, {
        success: result.success,
        uploadId: result.uploadId,
        hasUploadId: !!result.uploadId,
        uploadIdType: typeof result.uploadId,
        uploadIdValue: result.uploadId
      });
    });

    const successfulUploads = results.filter(r => r.success && r.uploadId);
    console.log('[FileUpload] Successful uploads with valid IDs:', successfulUploads.length, 'out of', results.length);
    console.log('[FileUpload] Successful uploads details:', successfulUploads.map(r => ({ uploadId: r.uploadId, analysisId: r.analysisId })));

    if (successfulUploads.length > 0) {
      // Automatically start analysis for all successful uploads
      try {
        const fileIds = successfulUploads
          .map(r => r.uploadId)
          .filter(id => id && typeof id === 'string' && id.trim().length > 0);
        const enabledParameters = analysisParameters.filter(p => p.enabled);

        console.log('[FileUpload] === STARTING ANALYSIS ===');
        console.log('[FileUpload] File IDs for analysis:', fileIds);
        console.log('[FileUpload] Enabled parameters:', enabledParameters.length);
        console.log('[FileUpload] User ID:', userId);

        if (fileIds.length === 0) {
          console.error('[FileUpload] No valid upload IDs found for analysis');
          setFiles(prev => prev.map(f => 
            ({ ...f, status: 'error', error: 'No valid upload IDs for analysis' })
          ));
          onUploadsComplete({ analysisStarted: false });
          return;
        }

        console.log('[FileUpload] Making request to /api/analysis...');
        const response = await fetch('/api/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fileIds,
            parameters: enabledParameters,
            userId,
          }),
        });

        console.log('[FileUpload] Analysis API response status:', response.status);
        console.log('[FileUpload] Analysis API response ok:', response.ok);
        
        const analysisResult = await response.json();
        console.log('[FileUpload] Analysis API response:', JSON.stringify(analysisResult, null, 2));

        if (analysisResult.success) {
          console.log('[FileUpload] Analysis started successfully:', analysisResult.analyses);
          console.log('[FileUpload] Analysis result details:', JSON.stringify(analysisResult, null, 2));
          console.log('[FileUpload] Analysis result success:', analysisResult.success);
          console.log('[FileUpload] Analysis result analyses:', analysisResult.analyses);
          console.log('[FileUpload] Analysis result analyses length:', analysisResult.analyses?.length);
          console.log('[FileUpload] Analysis result analyses is array:', Array.isArray(analysisResult.analyses));
          
          setFiles(prev => prev.map(f => 
            fileIds.includes(f.uploadId) ? { ...f, status: 'success', analysisTriggered: true } : f
          ));
          
          console.log('[FileUpload] Calling onUploadsComplete with the full analysis result...');
          onUploadsComplete(analysisResult);
        } else {
          console.error('[FileUpload] Analysis failed:', analysisResult.error);
          console.log('[FileUpload] Analysis result full response:', JSON.stringify(analysisResult, null, 2));
          console.log('[FileUpload] Analysis API returned success=false');
          
          // Show user-friendly error message
          const errorMessage = analysisResult.error || 'Failed to start analysis';
          setErrorMessages(prev => [...prev, `Analysis failed: ${errorMessage}`]);
          
          // Even if analysis fails, still redirect to call history so user can see their uploads
          // This ensures the user doesn't get stuck on the upload page
          console.log('[FileUpload] Redirecting to call history despite analysis failure');
          
          // Pass the entire failed response object so the parent component can handle it.
          onUploadsComplete(analysisResult);
        }
      } catch (error) {
        console.error('[FileUpload] Error starting analysis:', error);
        console.log('[FileUpload] Exception details:', error);
        setErrorMessages(prev => [...prev, 'An error occurred while starting the analysis.']);
        onUploadsComplete({ analysisStarted: false });
      }
    } else {
      console.log('[FileUpload] No successful uploads, not starting analysis');
      onUploadsComplete({ analysisStarted: false });
    }
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<{ success: boolean; uploadId?: string; error?: string; analysisId?: string }> => {
    let uploadId: string | null = null;
    let fileKey: string | null = null;

    try {
        const startTime = Date.now();
        const originalSize = uploadFile.file.size;
        
        // Step 1: Apply advanced audio compression if enabled
        let fileToUpload = uploadFile.file;
        let audioCompressionUsed = false;
        let compressionRatio = 0;
        
        if (enableAudioCompression && isValidAudioFile(uploadFile.file.type)) {
            try {
                setFiles(prev => prev.map(f => f.id === uploadFile.id ? { 
                    ...f, 
                    status: 'compressing',
                    progress: 0 
                } : f));
                
                console.log('[FileUpload] Applying audio compression:', compressionSettings);
                
                const compressionResult = await audioCompressor.compressAudio(
                    uploadFile.file, 
                    COMPRESSION_PRESETS[compressionSettings]
                );
                
                fileToUpload = compressionResult.compressedFile;
                audioCompressionUsed = true;
                compressionRatio = compressionResult.compressionRatio;
                
                console.log('[FileUpload] Audio compression complete:', {
                    originalSize: originalSize,
                    compressedSize: compressionResult.compressedSize,
                    ratio: `${(compressionRatio * 100).toFixed(1)}%`,
                    processingTime: compressionResult.processingTime
                });
                
                setFiles(prev => prev.map(f => f.id === uploadFile.id ? {
                    ...f,
                    originalAudioSize: originalSize,
                    compressedSize: compressionResult.compressedSize,
                    compressionTime: compressionResult.processingTime,
                    compressionRatio: compressionRatio,
                    audioCompressionUsed: true,
                    status: 'compressing',
                    progress: 25
                } : f));
                
            } catch (audioError) {
                console.warn('[FileUpload] Audio compression failed, falling back to original file:', audioError);
                // Continue with original file if audio compression fails
            }
        }

        // Step 2: Start multipart upload (gzip compression removed)
        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { 
            ...f, 
            status: 'uploading',
            progress: audioCompressionUsed ? 50 : 25
        } : f));
        
        const fileBuffer = await fileToUpload.arrayBuffer();
        const fileData = new Uint8Array(fileBuffer);

        setFiles(prev => prev.map(f => f.id === uploadFile.id ? {
            ...f,
            compressedSize: audioCompressionUsed ? fileToUpload.size : undefined,
            compressionTime: audioCompressionUsed ? (Date.now() - startTime) : undefined,
            status: 'uploading',
            progress: audioCompressionUsed ? 60 : 30
        } : f));

        // Step 3: Start multipart upload
        const startResponse = await fetch('/api/upload-large', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'start-upload',
                fileName: fileToUpload.name,
                contentType: fileToUpload.type,
            }),
        });

        const startData = await startResponse.json();
        if (!startData.success) throw new Error('Failed to start upload');
        uploadId = startData.uploadId;
        fileKey = startData.key;

        // Step 4: Get signed URLs for chunks
        const numChunks = Math.ceil(fileData.length / CHUNK_SIZE);
        const urlsResponse = await fetch('/api/upload-large', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get-upload-urls',
                key: fileKey,
                uploadId,
                parts: numChunks,
            }),
        });

        const urlsData = await urlsResponse.json();
        if (!urlsData.success) throw new Error('Failed to get upload URLs');

        // Step 5: Upload chunks
        const uploadedParts: { ETag: string, PartNumber: number }[] = [];
        let uploadedSize = 0;

        for (let i = 0; i < numChunks; i++) {
            const chunk = fileData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            const uploadResponse = await fetch(urlsData.urls[i], {
                method: 'PUT',
                body: chunk,
            });

            if (!uploadResponse.ok) throw new Error(`Chunk ${i + 1} upload failed`);

            uploadedParts.push({
                ETag: uploadResponse.headers.get('ETag')!,
                PartNumber: i + 1,
            });

            uploadedSize += chunk.length;
            const progress = Math.round((uploadedSize / fileData.length) * 100);
            setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading', progress } : f));
        }

        // Step 6: Complete upload
        const enabledParams = analysisParameters.filter(p => p.enabled);
        const completeResponse = await fetch('/api/upload-large', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'complete-upload',
                key: fileKey,
                uploadId,
                parts: uploadedParts,
                fileName: fileToUpload.name,
                contentType: fileToUpload.type,
                fileSize: fileToUpload.size,
                userId: userId,
                customParameters: enabledParams,
                originalContentType: uploadFile.file.type,
                audioCompressionUsed,
                originalAudioSize: audioCompressionUsed ? originalSize : undefined,
                compressionRatio: audioCompressionUsed ? compressionRatio : undefined,
            }),
        });

        const completeResult = await completeResponse.json();

        if (completeResult.success) {
          const uploadDuration = (Date.now() - startTime) / 1000;
          
          // Extract upload ID from results array (API returns results[0].uploadId)
          const uploadId = completeResult.results?.[0]?.uploadId || completeResult.uploadId;
          const analysisId = completeResult.analyses?.[0]?.id || completeResult.analysisId;
          
          console.log('[FileUpload] Complete result structure:', {
            hasResults: !!completeResult.results,
            resultCount: completeResult.results?.length || 0,
            firstResultUploadId: completeResult.results?.[0]?.uploadId,
            directUploadId: completeResult.uploadId,
            extractedUploadId: uploadId,
            analysisId: analysisId
          });
          
          const updatedFile = { 
            ...uploadFile, 
            status: 'success' as const, 
            progress: 100,
            uploadDuration,
            uploadId: uploadId,
            analysisId: analysisId,
            analysisTriggered: !!analysisId,
          };
          setFiles(prev => prev.map(f => f.id === uploadFile.id ? updatedFile : f));
          onUploadComplete({ success: true, file: updatedFile, analysisId: analysisId });
          console.log('[FileUpload] File upload success:', uploadFile.id, 'with uploadId:', uploadId);
          return { success: true, uploadId: uploadId, analysisId: analysisId };
        } else {
          throw new Error(completeResult.error || 'Failed to complete upload');
        }

    } catch (error: any) {
        console.error('[FileUpload] Error processing file:', uploadFile.file.name, error);
        const errorFile = {
            ...uploadFile,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Failed to compress or upload file'
        };
        setFiles(prev => prev.map(f => f.id === uploadFile.id ? errorFile : f));
        onUploadComplete({ success: false, file: errorFile });

        if (uploadId && fileKey) {
            await fetch('/api/upload-large', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'abort-upload',
                    key: fileKey,
                    uploadId,
                }),
            });
        }

        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  const renderFileStatus = (file: UploadFile) => {
    switch (file.status) {
      case 'pending':
        return <span className="text-gray-500">Pending</span>;
      case 'compressing':
        return <span className="text-blue-500 flex items-center"><Loader2 className="animate-spin mr-2 h-4 w-4" />Compressing...</span>;
      case 'uploading':
        return (
          <div className="w-full">
            <span className="text-blue-500">Uploading... {file.progress?.toFixed(0)}%</span>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${file.progress || 0}%` }}></div>
            </div>
          </div>
        );
      case 'success':
        return <span className="text-green-500 flex items-center"><CheckCircle className="mr-2 h-4 w-4" />{file.analysisTriggered ? 'Analysis Triggered' : 'Uploaded'}</span>;
      case 'error':
        return <span className="text-red-500 flex items-center"><AlertCircle className="mr-2 h-4 w-4" />Error</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl mx-auto my-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Audio Files</h2>
      
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600 mb-2">
          {isDragActive ? 'Drop the files here...' : 'Drag & drop audio files here'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to select files
        </p>
        <p className="text-xs text-gray-400">
          Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC, WebM
          <br />
          Max file size: {formatFileSize(maxFileSize)} | Max files: {maxFiles}
          <br />
          {enableAudioCompression && <span className="text-purple-600">🎵 Audio compression enabled</span>}
        </p>
      </div>

      {/* Error Messages */}
      {errorMessages.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Unable to upload {errorMessages.length} file{errorMessages.length > 1 ? 's' : ''}:
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errorMessages.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {error}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setErrorMessages([])}
                className="mt-3 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Selected Files</h3>
          <ul className="space-y-4">
            {files.map(f => (
              <li key={f.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 lg:space-x-4">
                  <div className="flex items-start space-x-4 flex-grow min-w-0">
                    <FileAudio className="h-8 w-8 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p 
                          className="font-medium text-gray-800 break-words"
                          title={f.file.name}
                        >
                          {formatFileName(f.file.name)}
                        </p>
                        {f.file.name.length > 60 && (
                          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded whitespace-nowrap">
                            Full name in tooltip
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>
                          Original: {formatFileSize(f.file.size)}
                          {f.status === 'success' && f.uploadDuration && ` - Uploaded in ${f.uploadDuration.toFixed(1)}s`}
                        </p>
                        
                        {/* Audio Compression Results */}
                        {f.audioCompressionUsed && f.originalAudioSize && f.compressedSize && (
                          <div className="bg-purple-50 p-2 rounded text-xs border border-purple-200">
                            <div className="flex items-center space-x-1 text-purple-700">
                              <Zap className="h-3 w-3" />
                              <span className="font-medium">Audio Compression Applied</span>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-2 text-purple-600">
                              <span>Before: {formatFileSize(f.originalAudioSize)}</span>
                              <span>After: {formatFileSize(f.compressedSize)}</span>
                              <span>Saved: {formatFileSize(f.originalAudioSize - f.compressedSize)}</span>
                              <span>Ratio: {f.compressionRatio ? ((1 - f.compressionRatio) * 100).toFixed(1) : 0}% smaller</span>
                            </div>
                            {f.compressionTime && (
                              <div className="mt-1 text-purple-600">
                                Processing time: {(f.compressionTime / 1000).toFixed(2)}s
                              </div>
                            )}
                          </div>
                        )}
                        
                        {f.status === 'error' && f.error && (
                          <div className="text-red-500 break-words">
                            <span className="font-medium">Error:</span> {f.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between lg:justify-end space-x-3 lg:space-x-4">
                    <div className="flex-shrink-0 text-sm min-w-0">
                      {renderFileStatus(f)}
                    </div>
                    <button 
                      onClick={() => removeFile(f.id)} 
                      className="text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      disabled={isUploading}
                      title="Remove file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audio Compression Settings */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Audio Compression Settings
        </h3>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">Audio Compression</h3>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-purple-700">Enable:</label>
              <input
                type="checkbox"
                checked={enableAudioCompression}
                onChange={(e) => setEnableAudioCompression(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          <p className="text-sm text-purple-700 mb-3">
            Compress audio files to reduce upload time and storage space while maintaining quality.
          </p>

          {enableAudioCompression && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-purple-700 mb-2">
                  Compression Level:
                </label>
                <select
                  value={compressionSettings}
                  onChange={(e) => setCompressionSettings(e.target.value as keyof typeof COMPRESSION_PRESETS)}
                  className="w-full px-3 py-2 text-sm border border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  <option value="FAST">Fast (Lower compression, faster processing)</option>
                  <option value="BALANCED">Balanced (Good compression, moderate processing)</option>
                  <option value="MAXIMUM">Maximum (Best compression, slower processing)</option>
                </select>
              </div>
              
              <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded">
                <div className="font-medium mb-1">Current Settings:</div>
                <div>Bitrate: {COMPRESSION_PRESETS[compressionSettings].bitRate}kbps</div>
                <div>Sample Rate: {COMPRESSION_PRESETS[compressionSettings].sampleRate}Hz</div>
                <div>Channels: {COMPRESSION_PRESETS[compressionSettings].channels}</div>
                <div>Format: {COMPRESSION_PRESETS[compressionSettings].outputFormat.toUpperCase()}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Parameters Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Analysis Parameters ({analysisParameters.filter(p => p.enabled).length} selected)
        </h3>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Analysis Parameters</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowParameterDetails(!showParameterDetails)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                {showParameterDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{showParameterDetails ? 'Hide' : 'Edit'}</span>
              </button>
              <button
                onClick={addNewParameter}
                className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          </div>
          
          <p className="text-sm text-blue-700 mb-3">
            Configure which aspects will be analyzed in your sales calls:
          </p>

          {!showParameterDetails ? (
            // Compact view - just show enabled parameters
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {analysisParameters.filter(p => p.enabled).map((param) => (
                <div key={param.id} className="flex items-start space-x-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium text-blue-800">{param.name}</span>
                    <p className="text-blue-600 text-xs mt-0.5">{param.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Detailed editable view
            <div className="space-y-3">
              {analysisParameters.map((param) => (
                <div key={param.id} className="border border-blue-200 rounded-lg p-3 bg-white">
                  {editingParameter === param.id ? (
                    <EditParameterForm
                      parameter={param}
                      onSave={(updates) => handleParameterEdit(param.id, updates)}
                      onCancel={() => setEditingParameter(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          onChange={() => handleParameterToggle(param.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                        />
                        <div className="flex-1">
                          <h4 className={`font-medium text-sm ${param.enabled ? 'text-gray-800' : 'text-gray-500'}`}>
                            {param.name}
                          </h4>
                          <p className={`text-xs mt-1 ${param.enabled ? 'text-gray-600' : 'text-gray-400'}`}>
                            {param.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => setEditingParameter(param.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Edit parameter"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {param.id.startsWith('custom_') && (
                          <button
                            onClick={() => removeParameter(param.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remove parameter"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
          <button
            onClick={uploadAllFiles}
            disabled={isUploading || files.filter(f => f.status === 'pending').length === 0}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="-ml-1 mr-3 h-5 w-5" />
                Upload and Analyze {files.filter(f => f.status === 'pending').length} File(s)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Edit Parameter Form Component
interface EditParameterFormProps {
  parameter: {
    id: string;
    name: string;
    description: string;
    prompt: string;
    enabled: boolean;
  };
  onSave: (updates: any) => void;
  onCancel: () => void;
}

function EditParameterForm({ parameter, onSave, onCancel }: EditParameterFormProps) {
  const [name, setName] = useState(parameter.name);
  const [description, setDescription] = useState(parameter.description);
  const [prompt, setPrompt] = useState(parameter.prompt);

  const handleSave = () => {
    if (!name.trim() || !prompt.trim()) {
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      prompt: prompt.trim()
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Parameter Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Analysis Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || !prompt.trim()}
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          <Save className="w-3 h-3" />
          <span>Save</span>
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-600 text-xs border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}