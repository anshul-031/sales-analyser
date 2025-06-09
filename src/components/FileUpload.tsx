'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, FileAudio, AlertCircle, CheckCircle } from 'lucide-react';
import { formatFileSize, isValidAudioFile } from '@/lib/utils';

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
  maxFiles = 10, 
  maxFileSize = 50 * 1024 * 1024 
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    console.log('[FileUpload] Files dropped:', { accepted: acceptedFiles.length, rejected: rejectedFiles.length });

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      console.warn('[FileUpload] Rejected files:', rejectedFiles);
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
        return combined.slice(0, maxFiles);
      }
      return combined;
    });
  }, [maxFiles]);

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

          {/* Upload Button */}
          {pendingFiles > 0 && (
            <div className="mt-6">
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
                    <span>Uploading {files.length} files...</span>
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