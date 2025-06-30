/**
 * Audio Compression Demo
 * Test page to demonstrate the audio compression capabilities
 */
'use client';

import React, { useState, useRef } from 'react';
import { 
  audioCompressor, 
  COMPRESSION_PRESETS, 
  CompressionSettings,
  AudioCompressor 
} from '@/lib/audio-compression';
import { formatFileSize } from '@/lib/utils';
import { Upload, Zap, Download, Play, Pause, BarChart3 } from 'lucide-react';

export default function AudioCompressionDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionResult, setCompressionResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof COMPRESSION_PRESETS>('MAXIMUM');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const compressedAudioRef = useRef<HTMLAudioElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCompressionResult(null);
      setError(null);
    }
  };

  const handleCompress = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await audioCompressor.compressAudio(
        selectedFile,
        COMPRESSION_PRESETS[selectedPreset]
      );
      
      setCompressionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compression failed');
      console.error('Compression error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCompressed = () => {
    if (!compressionResult) return;
    
    const url = URL.createObjectURL(compressionResult.compressedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = compressionResult.compressedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const estimatedRatio = selectedFile ? 
    AudioCompressor.estimateCompressionRatio(selectedFile, COMPRESSION_PRESETS[selectedPreset]) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎵 Audio Compression Demo
          </h1>
          <p className="text-gray-600">
            Test the advanced audio compression system with maximum compression settings
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Select Audio File
            </h2>

            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                Click to select an audio file
              </p>
              <p className="text-sm text-gray-500">
                Supported: MP3, WAV, M4A, AAC, OGG, FLAC, WebM
              </p>
            </div>

            {selectedFile && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Selected File</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Name:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                  <p><strong>Type:</strong> {selectedFile.type}</p>
                </div>
                
                <audio 
                  ref={audioRef}
                  controls 
                  className="w-full mt-3"
                  src={URL.createObjectURL(selectedFile)}
                />
              </div>
            )}

            {/* Compression Settings */}
            {selectedFile && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Compression Settings
                </h3>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Compression Preset
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value as keyof typeof COMPRESSION_PRESETS)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    <option value="MAXIMUM">Maximum (16kbps, mono, 11kHz)</option>
                    <option value="HIGH">High (32kbps, mono, 16kHz)</option>
                    <option value="MEDIUM">Medium (64kbps, mono, 22kHz)</option>
                    <option value="LOW">Low (96kbps, mono, 44kHz)</option>
                  </select>
                </div>

                <div className="bg-white p-3 rounded border">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Estimated Results</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Original: {formatFileSize(selectedFile.size)}</p>
                    <p>Estimated: {formatFileSize(selectedFile.size * (1 - estimatedRatio))}</p>
                    <p>Reduction: {(estimatedRatio * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <button
                  onClick={handleCompress}
                  disabled={isProcessing}
                  className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Compress Audio
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Compression Results
            </h2>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {compressionResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-3">✅ Compression Successful!</h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Original Size</p>
                      <p className="font-semibold">{formatFileSize(compressionResult.originalSize)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Compressed Size</p>
                      <p className="font-semibold text-green-600">{formatFileSize(compressionResult.compressedSize)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Compression Ratio</p>
                      <p className="font-semibold text-purple-600">{(compressionResult.compressionRatio * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Processing Time</p>
                      <p className="font-semibold">{compressionResult.processingTime}ms</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Settings Used</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Bitrate: {compressionResult.settings.bitRate}kbps</p>
                      <p>Sample Rate: {compressionResult.settings.sampleRate}Hz</p>
                      <p>Channels: {compressionResult.settings.channels === 1 ? 'Mono' : 'Stereo'}</p>
                      <p>Format: {compressionResult.settings.outputFormat.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Compressed Audio</h3>
                  <audio 
                    ref={compressedAudioRef}
                    controls 
                    className="w-full mb-3"
                    src={URL.createObjectURL(compressionResult.compressedFile)}
                  />
                  
                  <button
                    onClick={downloadCompressed}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Compressed File
                  </button>
                </div>

                {/* Compression Stats */}
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h3 className="font-medium text-indigo-900 mb-3">📊 Compression Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File size reduction:</span>
                      <span className="font-semibold text-indigo-600">
                        -{formatFileSize(compressionResult.originalSize - compressionResult.compressedSize)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Compression efficiency:</span>
                      <span className="font-semibold">
                        {compressionResult.compressionRatio > 0.8 ? '🔥 Excellent' :
                         compressionResult.compressionRatio > 0.6 ? '✅ Good' :
                         compressionResult.compressionRatio > 0.4 ? '⚡ Fair' : '📁 Minimal'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processing speed:</span>
                      <span className="font-semibold">
                        {compressionResult.processingTime < 1000 ? '🚀 Fast' :
                         compressionResult.processingTime < 5000 ? '⚡ Good' : '🐌 Slow'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Select and compress an audio file to see results</p>
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Technical Details</h2>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Audio Processing Pipeline</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Load and decode audio using Web Audio API</li>
                <li>Convert sample rate for speech optimization</li>
                <li>Convert stereo to mono for call recordings</li>
                <li>Apply audio normalization</li>
                <li>Basic noise reduction and gating</li>
                <li>Dynamic range compression</li>     
                <li>Encode to MP3 with custom bitrate</li>
                <li>Apply additional gzip compression</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Compression Presets</h3>
              <div className="space-y-2">
                {Object.entries(COMPRESSION_PRESETS).map(([key, preset]) => (
                  <div key={key} className="p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-800">{key}</div>
                    <div className="text-gray-600 text-xs">
                      {preset.bitRate}kbps, {preset.channels === 1 ? 'mono' : 'stereo'}, {preset.sampleRate}Hz
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
