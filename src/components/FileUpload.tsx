'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, FileAudio, AlertCircle, CheckCircle, Target, Edit3, Save, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { formatFileSize, isValidAudioFile } from '@/lib/utils';
import { DEFAULT_ANALYSIS_PARAMETERS } from '@/lib/gemini';
import { MAX_FILE_SIZE, MAX_FILES } from '@/lib/constants';

interface FileUploadProps {
  onUploadComplete: (response: unknown) => void;
  userId: string;
  maxFiles?: number;
  maxFileSize?: number;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  uploadId?: string;
}

export default function FileUpload({
  onUploadComplete,
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

  const uploadFiles = async () => {
    if (files.length === 0) return;

    console.log('[FileUpload] Starting upload process for', files.length, 'files');
    setIsUploading(true);

    try {
      const formData = new FormData();
      files.forEach(({ file }) => {
        formData.append('files', file);
      });
      formData.append('userId', userId);
      
      // Add custom analysis parameters
      const enabledParams = analysisParameters.filter(p => p.enabled);
      formData.append('customParameters', JSON.stringify(enabledParams));

      // Update status to uploading
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('[FileUpload] Upload response:', result);

      if (result.success) {
        // Update file statuses based on results
        setFiles(prev => prev.map(f => {
          const uploadResult = result.results.find((r: any) => r.filename === f.file.name);
          if (uploadResult) {
            return {
              ...f,
              status: uploadResult.success ? 'success' as const : 'error' as const,
              error: uploadResult.error,
              uploadId: uploadResult.id
            };
          }
          return { ...f, status: 'error' as const, error: 'Upload result not found' };
        }));

        // Call completion callback with full response (including analysis info)
        onUploadComplete(result);
        
        console.log('[FileUpload] Upload completed successfully:', result.summary?.successful || 0, 'files');
        if (result.analysisStarted) {
          console.log('[FileUpload] Analysis auto-started for uploaded files');
        }
      } else {
        console.error('[FileUpload] Upload failed:', result.error);
        setFiles(prev => prev.map(f => ({
          ...f,
          status: 'error' as const,
          error: result.error || 'Upload failed'
        })));
      }
    } catch (error) {
      console.error('[FileUpload] Upload error:', error);
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: 'Network error occurred'
      })));
    } finally {
      setIsUploading(false);
    }
  };

  const clearSuccessfulFiles = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <FileAudio className="w-4 h-4 text-gray-500" />;
    }
  };

  const pendingFiles = files.filter(f => f.status === 'pending').length;
  const successfulFiles = files.filter(f => f.status === 'success').length;
  const errorFiles = files.filter(f => f.status === 'error').length;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
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

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Selected Files ({files.length})
            </h3>
            {successfulFiles > 0 && (
              <button
                onClick={clearSuccessfulFiles}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Successful
              </button>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((fileItem) => (
              <div key={fileItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(fileItem.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {fileItem.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                    {fileItem.error && (
                      <p className="text-xs text-red-500 mt-1">{fileItem.error}</p>
                    )}
                  </div>
                </div>
                
                {fileItem.status === 'pending' && (
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Status Summary */}
          {(successfulFiles > 0 || errorFiles > 0) && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex justify-between text-sm">
                {successfulFiles > 0 && (
                  <span className="text-green-600">✓ {successfulFiles} successful</span>
                )}
                {errorFiles > 0 && (
                  <span className="text-red-600">✗ {errorFiles} failed</span>
                )}
              </div>
            </div>
          )}

          {/* Analysis Parameters Configuration */}
          {pendingFiles > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Analysis Parameters</h3>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    {analysisParameters.filter(p => p.enabled).length} selected
                  </span>
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
          )}

          {/* Upload Button */}
          {pendingFiles > 0 && (
            <div className="mt-4">
              <button
                onClick={uploadFiles}
                disabled={isUploading}
                className={`
                  w-full py-3 px-4 rounded-lg font-medium transition-colors
                  ${isUploading
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }
                  text-white
                `}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading & Analyzing {files.length} files...</span>
                  </div>
                ) : (
                 `Upload & Analyze ${pendingFiles} Files`
               )}
              </button>
            </div>
          )}
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