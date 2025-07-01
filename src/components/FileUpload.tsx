'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, FileAudio, AlertCircle, CheckCircle, Target, Edit3, Save, Plus, ChevronDown, ChevronUp, Loader2, Wind, Zap, Settings } from 'lucide-react';
import { formatFileSize, isValidAudioFile } from '@/lib/utils';
import { DEFAULT_ANALYSIS_PARAMETERS } from '@/lib/gemini';
import { MAX_FILE_SIZE, MAX_FILES, CHUNK_SIZE } from '@/lib/constants';
import * as fflate from 'fflate';
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

    const uploadPromises = files
      .filter(f => f.status === 'pending')
      .map(f => uploadFile(f));

    console.log('[FileUpload] Waiting for all uploads to complete...');
    const results = await Promise.all(uploadPromises);
    console.log('[FileUpload] All upload promises resolved:', results.map(r => ({ success: r.success, uploadId: r.uploadId })));

    setIsUploading(false);

    const successfulUploads = results.filter(r => r.success);
    console.log('[FileUpload] Successful uploads:', successfulUploads.length, 'out of', results.length);

    if (successfulUploads.length > 0) {
      // Automatically start analysis for all successful uploads
      try {
        const fileIds = successfulUploads.map(r => r.uploadId);
        const enabledParameters = analysisParameters.filter(p => p.enabled);

        console.log('[FileUpload] === STARTING ANALYSIS ===');
        console.log('[FileUpload] File IDs for analysis:', fileIds);
        console.log('[FileUpload] Enabled parameters:', enabledParameters.length);

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
        const analysisResult = await response.json();
        console.log('[FileUpload] Analysis API response:', JSON.stringify(analysisResult, null, 2));

        if (analysisResult.success) {
          console.log('[FileUpload] Analysis started successfully:', analysisResult.analyses);
          setFiles(prev => prev.map(f => 
            fileIds.includes(f.uploadId) ? { ...f, status: 'success', analysisTriggered: true } : f
          ));
          
          const callbackData = { 
            analysisStarted: true, 
            analyses: analysisResult.analyses 
          };
          console.log('[FileUpload] Calling onUploadsComplete with:', JSON.stringify(callbackData, null, 2));
          onUploadsComplete(callbackData);
        } else {
          console.error('[FileUpload] Analysis failed:', analysisResult.error);
          setErrorMessages(prev => [...prev, `Analysis failed: ${analysisResult.error}`]);
          onUploadsComplete({ analysisStarted: false });
        }
      } catch (error) {
        console.error('[FileUpload] Error starting analysis:', error);
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

        // Step 2: Apply additional gzip compression
        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { 
            ...f, 
            status: 'compressing',
            progress: audioCompressionUsed ? 50 : 25
        } : f));
        
        const fileBuffer = await fileToUpload.arrayBuffer();
        const compressedData = fflate.compressSync(new Uint8Array(fileBuffer), { level: 9 });
        const compressionTime = Date.now() - startTime;

        const finalCompressedFile = new File([compressedData], `${fileToUpload.name}.gz`, { type: 'application/gzip' });

        setFiles(prev => prev.map(f => f.id === uploadFile.id ? {
            ...f,
            compressedSize: finalCompressedFile.size,
            compressionTime,
            status: 'compressing',
            progress: 75
        } : f));

        // Step 3: Start multipart upload
        const startResponse = await fetch('/api/upload-large', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'start-upload',
                fileName: finalCompressedFile.name,
                contentType: finalCompressedFile.type,
            }),
        });

        const startData = await startResponse.json();
        if (!startData.success) throw new Error('Failed to start upload');
        uploadId = startData.uploadId;
        fileKey = startData.key;

        // Step 4: Get signed URLs for chunks
        const numChunks = Math.ceil(compressedData.length / CHUNK_SIZE);
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
            const chunk = compressedData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
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
            const progress = Math.round((uploadedSize / compressedData.length) * 100);
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
                fileName: finalCompressedFile.name,
                contentType: finalCompressedFile.type,
                fileSize: finalCompressedFile.size,
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
          const updatedFile = { 
            ...uploadFile, 
            status: 'success' as const, 
            progress: 100,
            uploadDuration,
            uploadId: completeResult.uploadId,
            analysisId: completeResult.analysisId,
            analysisTriggered: !!completeResult.analysisId,
          };
          setFiles(prev => prev.map(f => f.id === uploadFile.id ? updatedFile : f));
          onUploadComplete({ success: true, file: updatedFile, analysisId: completeResult.analysisId });
          console.log('[FileUpload] File upload success:', uploadFile.id);
          return { success: true, uploadId: completeResult.uploadId, analysisId: completeResult.analysisId };
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
          {enableAudioCompression && <span className="text-purple-600">📦 Advanced audio compression enabled</span>}
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
              <li key={f.id} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between space-x-4 shadow-sm">
                <div className="flex items-center space-x-4 flex-grow">
                  <FileAudio className="h-8 w-8 text-blue-500" />
                  <div className="flex-grow">
                    <p className="font-medium text-gray-800 truncate">{f.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(f.file.size)}
                      {f.status === 'success' && f.uploadDuration && ` - Uploaded in ${f.uploadDuration.toFixed(1)}s`}
                      {f.status === 'error' && f.error && <span className="text-red-500 ml-2">- {f.error}</span>}
                    </p>
                  </div>
                </div>
                <div className="w-48 text-sm">
                  {renderFileStatus(f)}
                </div>
                <button 
                  onClick={() => removeFile(f.id)} 
                  className="text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUploading}
                >
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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