/**
 * Advanced Audio Compression Utility
 * Provides maximum compression for audio files before upload
 */

// Import the more reliable lamejs fork
import * as lamejs from '@breezystack/lamejs';

export interface CompressionSettings {
  // Audio quality settings
  bitRate: number; // kbps (8-320)
  sampleRate: number; // Hz (8000-48000)
  channels: number; // 1 (mono) or 2 (stereo)
  
  // Processing settings
  normalize: boolean; // Normalize audio levels
  removeNoise: boolean; // Basic noise reduction
  compressAudio: boolean; // Dynamic range compression
  
  // Output format
  outputFormat: 'mp3' | 'opus' | 'aac';
}

export const COMPRESSION_PRESETS = {
  MAXIMUM: {
    bitRate: 16, // Even lower bitrate for maximum compression
    sampleRate: 11025, // Much lower sample rate for speech
    channels: 1, // Mono for call recordings
    normalize: true,
    removeNoise: true,
    compressAudio: true,
    outputFormat: 'mp3' as const,
  },
  HIGH: {
    bitRate: 32, // Very low bitrate
    sampleRate: 16000, // Lower sample rate for speech
    channels: 1,
    normalize: true,
    removeNoise: true,
    compressAudio: true,
    outputFormat: 'mp3' as const,
  },
  MEDIUM: {
    bitRate: 64,
    sampleRate: 22050,
    channels: 1,
    normalize: true,
    removeNoise: true,
    compressAudio: true,
    outputFormat: 'mp3' as const,
  },
  LOW: {
    bitRate: 96,
    sampleRate: 44100,
    channels: 1, // Still mono for better compression
    normalize: false,
    removeNoise: false,
    compressAudio: false,
    outputFormat: 'mp3' as const,
  },
} as const;

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
  settings: CompressionSettings;
}

export class AudioCompressor {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize Web Audio API context
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Compress an audio file with maximum compression settings
   */
  async compressAudio(
    file: File, 
    settings: CompressionSettings = COMPRESSION_PRESETS.MAXIMUM
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = file.size;

    try {
      console.log('[AudioCompressor] 🎵 Starting compression:', {
        filename: file.name,
        originalSize: originalSize,
        originalSizeFormatted: this.formatBytes(originalSize),
        mimeType: file.type,
        settings
      });

      // Step 1: Load and decode audio file
      console.log('[AudioCompressor] 📂 Step 1: Loading and decoding audio file...');
      const loadStart = Date.now();
      const audioBuffer = await this.loadAudioFile(file);
      const loadTime = Date.now() - loadStart;
      
      console.log('[AudioCompressor] ✅ Audio file loaded:', {
        duration: `${audioBuffer.duration.toFixed(2)}s`,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
        loadTime: `${loadTime}ms`,
        estimatedUncompressedSize: this.formatBytes(audioBuffer.length * audioBuffer.numberOfChannels * 4) // 32-bit float
      });
      
      // Step 2: Process audio (normalize, noise reduction, etc.)
      console.log('[AudioCompressor] 🔧 Step 2: Processing audio with settings:', settings);
      const processStart = Date.now();
      const processedBuffer = await this.processAudio(audioBuffer, settings);
      const processTime = Date.now() - processStart;
      
      console.log('[AudioCompressor] ✅ Audio processing complete:', {
        originalDuration: `${audioBuffer.duration.toFixed(2)}s`,
        processedDuration: `${processedBuffer.duration.toFixed(2)}s`,
        originalSampleRate: audioBuffer.sampleRate,
        processedSampleRate: processedBuffer.sampleRate,
        originalChannels: audioBuffer.numberOfChannels,
        processedChannels: processedBuffer.numberOfChannels,
        processTime: `${processTime}ms`,
        sizeReduction: `${audioBuffer.length} → ${processedBuffer.length} samples`
      });
      
      // Step 3: Encode to compressed format
      console.log('[AudioCompressor] 🗜️ Step 3: Encoding to compressed format...');
      const encodeStart = Date.now();
      const compressedBlob = await this.encodeAudio(processedBuffer, settings);
      const encodeTime = Date.now() - encodeStart;
      
      console.log('[AudioCompressor] ✅ Audio encoding complete:', {
        encodedSize: compressedBlob.size,
        encodedSizeFormatted: this.formatBytes(compressedBlob.size),
        encodeTime: `${encodeTime}ms`,
        format: settings.outputFormat,
        compressionFromOriginal: `${(((originalSize - compressedBlob.size) / originalSize) * 100).toFixed(1)}%`
      });
      
      // Step 4: Create compressed file
      const compressedFile = new File(
        [compressedBlob], 
        this.getCompressedFileName(file.name, settings.outputFormat),
        { type: this.getMimeType(settings.outputFormat) }
      );

      const compressionRatio = (originalSize - compressedFile.size) / originalSize;
      const processingTime = Date.now() - startTime;

      console.log('[AudioCompressor] 🎉 Compression complete - Final Results:', {
        originalFile: file.name,
        compressedFile: compressedFile.name,
        originalSize: originalSize,
        originalSizeFormatted: this.formatBytes(originalSize),
        compressedSize: compressedFile.size,
        compressedSizeFormatted: this.formatBytes(compressedFile.size),
        compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`,
        sizeSaved: this.formatBytes(originalSize - compressedFile.size),
        totalProcessingTime: `${processingTime}ms`,
        breakdown: {
          loading: `${loadTime}ms`,
          processing: `${processTime}ms`,
          encoding: `${encodeTime}ms`
        },
        targetSettings: {
          bitrate: `${settings.bitRate}kbps`,
          sampleRate: `${settings.sampleRate}Hz`,
          channels: settings.channels,
          format: settings.outputFormat
        }
      });

      // Debug: Check if compression is actually working
      if (compressionRatio < 0.1) {
        console.warn('[AudioCompressor] ⚠️ LOW COMPRESSION WARNING:', {
          message: 'Compression ratio is unexpectedly low',
          expectedRatio: '80-95%',
          actualRatio: `${(compressionRatio * 100).toFixed(1)}%`,
          possibleCauses: [
            'File already highly compressed',
            'MP3 encoding issue',
            'Settings not applied correctly',
            'Audio processing not reducing data'
          ]
        });
      }

      return {
        compressedFile,
        originalSize,
        compressedSize: compressedFile.size,
        compressionRatio,
        processingTime,
        settings
      };

    } catch (error) {
      console.error('[AudioCompressor] ❌ Compression failed:', error);
      throw new Error(`Audio compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and decode audio file using Web Audio API
   */
  private async loadAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Web Audio API not supported');
    }

    const arrayBuffer = await file.arrayBuffer();
    
    try {
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      // Fallback: try with a fresh context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    }
  }

  /**
   * Process audio with various enhancements and optimizations
   */
  private async processAudio(audioBuffer: AudioBuffer, settings: CompressionSettings): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Web Audio API not supported');
    }

    console.log('[AudioCompressor] 🔧 Starting audio processing:', {
      inputBuffer: {
        duration: `${audioBuffer.duration.toFixed(2)}s`,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      },
      targetSettings: {
        sampleRate: settings.sampleRate,
        channels: settings.channels,
        normalize: settings.normalize,
        removeNoise: settings.removeNoise,
        compressAudio: settings.compressAudio
      }
    });

    // Calculate target buffer size
    const targetLength = Math.floor(audioBuffer.length * (settings.sampleRate / audioBuffer.sampleRate));
    console.log('[AudioCompressor] 📏 Buffer size calculation:', {
      originalLength: audioBuffer.length,
      targetLength: targetLength,
      sampleRateRatio: settings.sampleRate / audioBuffer.sampleRate,
      expectedDuration: `${(targetLength / settings.sampleRate).toFixed(2)}s`
    });

    // Convert to target sample rate and channels
    const processedBuffer = this.audioContext.createBuffer(
      settings.channels,
      targetLength,
      settings.sampleRate
    );

    console.log('[AudioCompressor] 🔄 Processing channels...');

    // Process each channel with chunked processing for large files
    for (let channel = 0; channel < Math.min(settings.channels, audioBuffer.numberOfChannels); channel++) {
      console.log(`[AudioCompressor] 📊 Processing channel ${channel + 1}/${settings.channels}...`);
      
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Check if this is a very large file that needs special handling
      const isLargeFile = inputData.length > 5000000; // 5M samples
      if (isLargeFile) {
        console.log(`[AudioCompressor] ⚠️ Large file detected (${inputData.length} samples), using optimized processing...`);
      }
      
      // Calculate stats safely without spread operator to avoid stack overflow
      let min = inputData[0];
      let max = inputData[0];
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        const val = inputData[i];
        if (val < min) min = val;
        if (val > max) max = val;
        sumSquares += val * val;
        
        // Yield control periodically for large files to prevent freezing
        if (isLargeFile && i % 100000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      const rms = Math.sqrt(sumSquares / inputData.length);
      
      console.log(`[AudioCompressor] Channel ${channel} input stats:`, {
        length: inputData.length,
        min: min.toFixed(4),
        max: max.toFixed(4),
        rms: rms.toFixed(4)
      });
      
      // Resample audio
      console.log(`[AudioCompressor] 🔄 Resampling channel ${channel}...`);
      const resampleStart = Date.now();
      const resampledData = await this.resampleAudio(inputData, audioBuffer.sampleRate, settings.sampleRate);
      const resampleTime = Date.now() - resampleStart;
      
      console.log(`[AudioCompressor] ✅ Resampling complete:`, {
        originalLength: inputData.length,
        resampledLength: resampledData.length,
        resampleTime: `${resampleTime}ms`,
        compressionRatio: `${(1 - resampledData.length / inputData.length) * 100}%`
      });
      
      // Apply processing effects
      let processedData = resampledData;
      
      if (settings.normalize) {
        console.log(`[AudioCompressor] 🔊 Normalizing channel ${channel}...`);
        const normalizeStart = Date.now();
        
        // Calculate RMS safely without reduce
        let sumSquares = 0;
        for (let i = 0; i < processedData.length; i++) {
          sumSquares += processedData[i] * processedData[i];
        }
        const originalRMS = Math.sqrt(sumSquares / processedData.length);
        
        processedData = this.normalizeAudio(processedData);
        const normalizeTime = Date.now() - normalizeStart;
        
        // Calculate new RMS safely
        sumSquares = 0;
        for (let i = 0; i < processedData.length; i++) {
          sumSquares += processedData[i] * processedData[i];
        }
        const newRMS = Math.sqrt(sumSquares / processedData.length);
        
        console.log(`[AudioCompressor] ✅ Normalization complete:`, {
          originalRMS: originalRMS.toFixed(4),
          normalizedRMS: newRMS.toFixed(4),
          gain: (newRMS / originalRMS).toFixed(2),
          normalizeTime: `${normalizeTime}ms`
        });
      }
      
      if (settings.removeNoise) {
        console.log(`[AudioCompressor] 🔇 Removing noise from channel ${channel}...`);
        const noiseStart = Date.now();
        
        // Count non-zero samples safely
        let originalNonZero = 0;
        for (let i = 0; i < processedData.length; i++) {
          if (Math.abs(processedData[i]) > 0.01) originalNonZero++;
        }
        
        processedData = this.basicNoiseReduction(processedData);
        const noiseTime = Date.now() - noiseStart;
        
        // Count new non-zero samples safely
        let newNonZero = 0;
        for (let i = 0; i < processedData.length; i++) {
          if (Math.abs(processedData[i]) > 0.01) newNonZero++;
        }
        
        console.log(`[AudioCompressor] ✅ Noise reduction complete:`, {
          originalNonZeroSamples: originalNonZero,
          processedNonZeroSamples: newNonZero,
          samplesGated: originalNonZero - newNonZero,
          gatingRatio: `${((originalNonZero - newNonZero) / originalNonZero * 100).toFixed(1)}%`,
          noiseTime: `${noiseTime}ms`
        });
      }
      
      if (settings.compressAudio) {
        console.log(`[AudioCompressor] 🗜️ Compressing dynamics for channel ${channel}...`);
        const compressStart = Date.now();
        
        // Find peak safely without spread operator
        let originalPeak = 0;
        for (let i = 0; i < processedData.length; i++) {
          const abs = Math.abs(processedData[i]);
          if (abs > originalPeak) originalPeak = abs;
        }
        
        processedData = this.compressAudioDynamics(processedData);
        const compressTime = Date.now() - compressStart;
        
        // Find new peak safely
        let newPeak = 0;
        for (let i = 0; i < processedData.length; i++) {
          const abs = Math.abs(processedData[i]);
          if (abs > newPeak) newPeak = abs;
        }
        
        console.log(`[AudioCompressor] ✅ Dynamic compression complete:`, {
          originalPeak: originalPeak.toFixed(4),
          compressedPeak: newPeak.toFixed(4),
          peakReduction: `${((originalPeak - newPeak) / originalPeak * 100).toFixed(1)}%`,
          compressTime: `${compressTime}ms`
        });
      }
      
      // Calculate final stats safely
      let finalMin = processedData[0];
      let finalMax = processedData[0];
      let finalSumSquares = 0;
      let nonZeroSamples = 0;
      
      for (let i = 0; i < processedData.length; i++) {
        const val = processedData[i];
        if (val < finalMin) finalMin = val;
        if (val > finalMax) finalMax = val;
        finalSumSquares += val * val;
        if (Math.abs(val) > 0.001) nonZeroSamples++;
      }
      
      const finalRms = Math.sqrt(finalSumSquares / processedData.length);
      
      console.log(`[AudioCompressor] Channel ${channel} final stats:`, {
        length: processedData.length,
        min: finalMin.toFixed(4),
        max: finalMax.toFixed(4),
        rms: finalRms.toFixed(4),
        nonZeroSamples: nonZeroSamples
      });
      
      outputData.set(processedData);
    }

    console.log('[AudioCompressor] ✅ Audio processing complete - Final buffer:', {
      duration: `${processedBuffer.duration.toFixed(2)}s`,
      sampleRate: processedBuffer.sampleRate,
      channels: processedBuffer.numberOfChannels,
      length: processedBuffer.length,
      estimatedDataSize: this.formatBytes(processedBuffer.length * processedBuffer.numberOfChannels * 4)
    });

    return processedBuffer;
  }

  /**
   * Resample audio to target sample rate (optimized for large files)
   */
  private async resampleAudio(inputData: Float32Array, inputSampleRate: number, outputSampleRate: number): Promise<Float32Array> {
    if (inputSampleRate === outputSampleRate) {
      return inputData;
    }

    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.floor(inputData.length / ratio);
    const outputData = new Float32Array(outputLength);
    const isLargeFile = outputLength > 1000000; // 1M samples

    console.log(`[AudioCompressor] Resampling ${inputData.length} → ${outputLength} samples (ratio: ${ratio.toFixed(3)})`);

    // Use chunked processing for large files to prevent browser freezing
    const chunkSize = isLargeFile ? 50000 : outputLength;
    
    for (let start = 0; start < outputLength; start += chunkSize) {
      const end = Math.min(start + chunkSize, outputLength);
      
      for (let i = start; i < end; i++) {
        const inputIndex = i * ratio;
        const inputIndexFloor = Math.floor(inputIndex);
        const inputIndexCeil = Math.min(inputIndexFloor + 1, inputData.length - 1);
        const fraction = inputIndex - inputIndexFloor;
        
        // Linear interpolation
        outputData[i] = inputData[inputIndexFloor] * (1 - fraction) + inputData[inputIndexCeil] * fraction;
      }
      
      // Yield control for large files
      if (isLargeFile) {
        await new Promise(resolve => setTimeout(resolve, 0));
        if (start % 500000 === 0) {
          console.log(`[AudioCompressor] Resampling progress: ${((start / outputLength) * 100).toFixed(1)}%`);
        }
      }
    }

    return outputData;
  }

  /**
   * Normalize audio levels
   */
  private normalizeAudio(audioData: Float32Array): Float32Array {
    // Find max value safely without spread operator
    let maxValue = 0;
    for (let i = 0; i < audioData.length; i++) {
      const abs = Math.abs(audioData[i]);
      if (abs > maxValue) maxValue = abs;
    }
    
    if (maxValue === 0) return audioData;
    
    const normalizedData = new Float32Array(audioData.length);
    const gain = 0.95 / maxValue; // Leave some headroom
    
    for (let i = 0; i < audioData.length; i++) {
      normalizedData[i] = audioData[i] * gain;
    }
    
    return normalizedData;
  }

  /**
   * Basic noise reduction using spectral gating
   */
  private basicNoiseReduction(audioData: Float32Array): Float32Array {
    const processedData = new Float32Array(audioData.length);
    
    // More aggressive noise floor threshold for better compression
    const threshold = 0.02; // Higher threshold to gate more noise for calls
    const fadeLength = 64; // Samples to fade in/out to avoid clicks
    
    let consecutiveNoiseSamples = 0;
    let isInNoise = false;
    
    for (let i = 0; i < audioData.length; i++) {
      const amplitude = Math.abs(audioData[i]);
      
      if (amplitude < threshold) {
        consecutiveNoiseSamples++;
        // If we have enough consecutive noise samples, start gating
        if (consecutiveNoiseSamples > fadeLength && !isInNoise) {
          isInNoise = true;
        }
        
        if (isInNoise) {
          processedData[i] = 0; // Gate out noise
        } else {
          // Fade out approaching noise
          const fadeRatio = Math.max(0, 1 - (consecutiveNoiseSamples / fadeLength));
          processedData[i] = audioData[i] * fadeRatio;
        }
      } else {
        // Signal above threshold
        if (isInNoise && consecutiveNoiseSamples > 0) {
          // Fade back in from noise
          const fadeRatio = Math.min(1, (fadeLength - consecutiveNoiseSamples) / fadeLength);
          processedData[i] = audioData[i] * fadeRatio;
        } else {
          processedData[i] = audioData[i];
        }
        
        consecutiveNoiseSamples = 0;
        isInNoise = false;
      }
    }
    
    return processedData;
  }

  /**
   * Dynamic range compression - more aggressive for better encoding efficiency
   */
  private compressAudioDynamics(audioData: Float32Array): Float32Array {
    const compressedData = new Float32Array(audioData.length);
    
    // More aggressive compression settings
    const threshold = 0.3; // Lower threshold catches more audio
    const ratio = 8; // Higher compression ratio (8:1)
    const attackTime = 0.001; // Fast attack in seconds  
    const releaseTime = 0.1; // Release time in seconds
    const sampleRate = 44100; // Assume standard sample rate for envelope calculation
    
    // Calculate envelope follower coefficients
    const attackCoeff = Math.exp(-1 / (attackTime * sampleRate));
    const releaseCoeff = Math.exp(-1 / (releaseTime * sampleRate));
    
    let envelope = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      const amplitude = Math.abs(sample);
      
      // Envelope follower
      if (amplitude > envelope) {
        envelope = amplitude + (envelope - amplitude) * attackCoeff;
      } else {
        envelope = amplitude + (envelope - amplitude) * releaseCoeff;
      }
      
      // Apply compression
      if (envelope > threshold) {
        // Calculate compression
        const excess = envelope - threshold;
        const compressedExcess = excess / ratio;
        const compressedAmplitude = threshold + compressedExcess;
        
        // Apply makeup gain to compensate for level reduction
        const makeupGain = 1.2;
        const gainReduction = compressedAmplitude / envelope;
        compressedData[i] = sample * gainReduction * makeupGain;
        
        // Ensure we don't clip
        compressedData[i] = Math.max(-0.95, Math.min(0.95, compressedData[i]));
      } else {
        // Apply light makeup gain to uncompressed signals
        compressedData[i] = sample * 1.1;
        compressedData[i] = Math.max(-0.95, Math.min(0.95, compressedData[i]));
      }
    }
    
    return compressedData;
  }

  /**
   * Encode processed audio to compressed format
   */
  private async encodeAudio(audioBuffer: AudioBuffer, settings: CompressionSettings): Promise<Blob> {
    switch (settings.outputFormat) {
      case 'mp3':
        return this.encodeToMP3(audioBuffer, settings);
      default:
        throw new Error(`Unsupported output format: ${settings.outputFormat}`);
    }
  }

  /**
   * Encode to MP3 using LameJS
   */
  private encodeToMP3(audioBuffer: AudioBuffer, settings: CompressionSettings): Blob {
    console.log('[AudioCompressor] 🎵 Starting MP3 encoding:', {
      bufferInfo: {
        duration: `${audioBuffer.duration.toFixed(2)}s`,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      },
      encodingSettings: {
        channels: settings.channels,
        sampleRate: settings.sampleRate,
        bitRate: `${settings.bitRate}kbps`
      }
    });

    // Initialize encoder with error handling
    let encoder;
    try {
      console.log('[AudioCompressor] 🔧 Initializing MP3 encoder...');
      encoder = new lamejs.Mp3Encoder(settings.channels, settings.sampleRate, settings.bitRate);
      console.log('[AudioCompressor] ✅ MP3 encoder initialized successfully');
    } catch (error) {
      console.error('[AudioCompressor] ❌ Failed to initialize MP3 encoder:', error);
      throw new Error(`MP3 encoder initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const mp3Data: Uint8Array[] = [];

    // Convert Float32Array to Int16Array for MP3 encoding
    const totalSamples = audioBuffer.length * settings.channels;
    const samples = new Int16Array(totalSamples);
    
    console.log('[AudioCompressor] 🔄 Converting audio data for MP3 encoding...');
    
    if (settings.channels === 1) {
      // Mono
      const channelData = audioBuffer.getChannelData(0);
      console.log('[AudioCompressor] Processing mono audio:', {
        channelDataLength: channelData.length,
        samplesArrayLength: samples.length,
        expectedLength: audioBuffer.length
      });
      
      // Calculate stats safely without spread operator to avoid stack overflow
      let clippedSamples = 0;
      let peakValue = 0;
      let sumSquares = 0;
      
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        if (Math.abs(channelData[i]) > 1) clippedSamples++;
        const abs = Math.abs(channelData[i]);
        if (abs > peakValue) peakValue = abs;
        sumSquares += channelData[i] * channelData[i];
        samples[i] = sample * 0x7FFF;
      }
      
      const rmsValue = Math.sqrt(sumSquares / channelData.length);
      
      console.log('[AudioCompressor] Mono conversion stats:', {
        totalSamples: channelData.length,
        clippedSamples: clippedSamples,
        clippingPercentage: `${(clippedSamples / channelData.length * 100).toFixed(2)}%`,
        peakValue: peakValue.toFixed(4),
        rmsValue: rmsValue.toFixed(4)
      });
    } else {
      // Stereo
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;
      
      console.log('[AudioCompressor] Processing stereo audio:', {
        leftChannelLength: leftChannel.length,
        rightChannelLength: rightChannel.length,
        interleavedLength: samples.length,
        expectedLength: audioBuffer.length * 2
      });
      
      let clippedSamples = 0;
      let leftPeak = 0;
      let rightPeak = 0;
      
      for (let i = 0; i < leftChannel.length; i++) {
        const leftSample = Math.max(-1, Math.min(1, leftChannel[i]));
        const rightSample = Math.max(-1, Math.min(1, rightChannel[i]));
        
        if (Math.abs(leftChannel[i]) > 1 || Math.abs(rightChannel[i]) > 1) clippedSamples++;
        
        const leftAbs = Math.abs(leftChannel[i]);
        const rightAbs = Math.abs(rightChannel[i]);
        if (leftAbs > leftPeak) leftPeak = leftAbs;
        if (rightAbs > rightPeak) rightPeak = rightAbs;
        
        samples[i * 2] = leftSample * 0x7FFF;
        samples[i * 2 + 1] = rightSample * 0x7FFF;
      }
      
      console.log('[AudioCompressor] Stereo conversion stats:', {
        totalSamples: leftChannel.length * 2,
        clippedSamples: clippedSamples,
        clippingPercentage: `${(clippedSamples / leftChannel.length * 100).toFixed(2)}%`,
        leftPeak: leftPeak.toFixed(4),
        rightPeak: rightPeak.toFixed(4)
      });
    }

    // Encode in chunks
    const chunkSize = 1152; // MP3 frame size
    const totalChunks = Math.ceil(samples.length / (chunkSize * settings.channels));
    let processedChunks = 0;
    let totalEncodedBytes = 0;
    
    console.log('[AudioCompressor] 🔄 Encoding MP3 chunks:', {
      totalSamples: samples.length,
      chunkSize: chunkSize,
      totalChunks: totalChunks,
      channels: settings.channels,
      samplesPerChunk: chunkSize * settings.channels
    });
    
    for (let i = 0; i < samples.length; i += chunkSize * settings.channels) {
      const chunk = samples.subarray(i, i + chunkSize * settings.channels);
      const mp3buf = encoder.encodeBuffer(chunk);
      
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
        totalEncodedBytes += mp3buf.length;
      }
      
      processedChunks++;
      
      // Log progress every 100 chunks or at end
      if (processedChunks % 100 === 0 || processedChunks === totalChunks) {
        console.log(`[AudioCompressor] Progress: ${processedChunks}/${totalChunks} chunks (${(processedChunks / totalChunks * 100).toFixed(1)}%), encoded ${totalEncodedBytes} bytes`);
      }
    }

    // Flush encoder
    console.log('[AudioCompressor] 🔚 Flushing MP3 encoder...');
    const mp3buf = encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
      totalEncodedBytes += mp3buf.length;
      console.log('[AudioCompressor] Final flush added', mp3buf.length, 'bytes');
    }

    const finalBlob = new Blob(mp3Data, { type: 'audio/mp3' });
    
    console.log('[AudioCompressor] 🎉 MP3 encoding complete:', {
      totalChunks: mp3Data.length,
      totalEncodedBytes: totalEncodedBytes,
      finalBlobSize: finalBlob.size,
      compressionEfficiency: {
        originalDataSize: samples.length * 2, // Int16 = 2 bytes per sample
        encodedSize: finalBlob.size,
        rawCompressionRatio: `${((1 - finalBlob.size / (samples.length * 2)) * 100).toFixed(1)}%`
      },
      targetBitrate: `${settings.bitRate}kbps`,
      actualBitrate: `${((finalBlob.size * 8) / audioBuffer.duration / 1000).toFixed(1)}kbps`,
      duration: `${audioBuffer.duration.toFixed(2)}s`
    });

    // Validate encoding results
    if (finalBlob.size === 0) {
      console.error('[AudioCompressor] ❌ MP3 encoding failed - zero size output');
      throw new Error('MP3 encoding produced zero-size output');
    }
    
    if (mp3Data.length === 0) {
      console.error('[AudioCompressor] ❌ MP3 encoding failed - no data chunks produced');
      throw new Error('MP3 encoding produced no data chunks');
    }

    return finalBlob;
  }

  /**
   * Get compressed filename with appropriate extension
   */
  private getCompressedFileName(originalName: string, format: string): string {
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    return `${baseName}_compressed.${format}`;
  }

  /**
   * Get MIME type for output format
   */
  private getMimeType(format: string): string {
    switch (format) {
      case 'mp3': return 'audio/mpeg';
      case 'opus': return 'audio/opus';
      case 'aac': return 'audio/aac';
      default: return 'audio/mpeg';
    }
  }

  /**
   * Estimate compression ratio before processing
   */
  static estimateCompressionRatio(file: File, settings: CompressionSettings): number {
    console.log('[AudioCompressor] Estimating compression ratio:', {
      fileName: file.name,
      fileSize: file.size,
      settings: settings
    });
    
    // Rough estimation based on bitrate and format
    const originalBitrate = this.estimateOriginalBitrate(file);
    const targetBitrate = settings.bitRate;
    
    // Factor in sample rate reduction
    const sampleRateReduction = settings.sampleRate / 44100; // Most audio is 44.1kHz
    
    // Factor in channel reduction (stereo to mono gives ~50% reduction)
    const channelReduction = settings.channels === 1 ? 0.5 : 1.0;
    
    // Calculate compression ratio based on bitrate, sample rate, and channels
    const bitrateRatio = targetBitrate / originalBitrate;
    const overallRatio = bitrateRatio * sampleRateReduction * channelReduction;
    
    // Convert to compression percentage (how much we save)
    const compressionRatio = Math.max(0, Math.min(0.95, 1 - overallRatio));
    
    console.log('[AudioCompressor] Compression estimation:', {
      originalBitrate: `${originalBitrate}kbps`,
      targetBitrate: `${targetBitrate}kbps`,
      bitrateRatio: bitrateRatio.toFixed(3),
      sampleRateReduction: sampleRateReduction.toFixed(3),
      channelReduction: channelReduction.toFixed(3),
      overallRatio: overallRatio.toFixed(3),
      estimatedCompressionRatio: `${(compressionRatio * 100).toFixed(1)}%`
    });
    
    return compressionRatio;
  }

  /**
   * Estimate original file bitrate based on file size and format
   */
  private static estimateOriginalBitrate(file: File): number {
    const extension = file.name.toLowerCase().split('.').pop();
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Try to calculate actual bitrate if possible (assuming typical durations)
    let estimatedBitrate: number;
    
    switch (extension) {
      case 'wav':
        // WAV is typically 44.1kHz, 16-bit, stereo = ~1411 kbps
        // But calculate from file size if possible
        estimatedBitrate = Math.max(700, Math.min(1500, (fileSizeMB * 8 * 1024) / (fileSizeMB / 10))); // Assume ~10MB per minute for WAV
        break;
      case 'flac':
        // FLAC compression typically achieves 50-70% of WAV size
        estimatedBitrate = Math.max(400, Math.min(1000, (fileSizeMB * 8 * 1024) / (fileSizeMB / 6))); // Assume ~6MB per minute for FLAC
        break;
      case 'mp3':
        // Calculate from file size - most MP3s are 1-2MB per minute
        const estimatedDurationMinutes = fileSizeMB / 1.5; // Assume 1.5MB per minute average
        estimatedBitrate = estimatedDurationMinutes > 0 ? (fileSizeMB * 8 * 1024) / estimatedDurationMinutes : 128;
        estimatedBitrate = Math.max(64, Math.min(320, estimatedBitrate));
        break;
      case 'm4a':
      case 'aac':
        // AAC is typically more efficient than MP3
        const estimatedDurationMinutesAAC = fileSizeMB / 1.2; // Assume 1.2MB per minute average
        estimatedBitrate = estimatedDurationMinutesAAC > 0 ? (fileSizeMB * 8 * 1024) / estimatedDurationMinutesAAC : 128;
        estimatedBitrate = Math.max(64, Math.min(256, estimatedBitrate));
        break;
      case 'ogg':
        // OGG Vorbis similar to MP3 but slightly more efficient
        estimatedBitrate = Math.max(64, Math.min(256, (fileSizeMB * 8 * 1024) / (fileSizeMB / 1.3)));
        break;
      case 'webm':
        // WebM audio is typically Opus, very efficient
        estimatedBitrate = Math.max(32, Math.min(128, (fileSizeMB * 8 * 1024) / (fileSizeMB / 0.8)));
        break;
      default:
        // Default assumption for unknown formats
        estimatedBitrate = 128;
    }
    
    console.log('[AudioCompressor] Bitrate estimation:', {
      fileName: file.name,
      extension: extension,
      fileSizeMB: fileSizeMB.toFixed(2),
      estimatedBitrate: `${estimatedBitrate.toFixed(0)}kbps`
    });
    
    return estimatedBitrate;
  }
}

// Export singleton instance
export const audioCompressor = new AudioCompressor();
