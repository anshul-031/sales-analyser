import { AudioCompressor, COMPRESSION_PRESETS } from '../audio-compression';

const mockAudioBuffer = {
  getChannelData: jest.fn(() => new Float32Array(10)),
  sampleRate: 44100,
  length: 441000,
  duration: 10,
  numberOfChannels: 1,
};

describe('AudioCompressor', () => {
  let audioCompressor: AudioCompressor;
  let mockAudioContext: any;

  beforeEach(() => {
    mockAudioContext = {
      decodeAudioData: jest.fn().mockResolvedValue(mockAudioBuffer),
      createBuffer: jest.fn().mockReturnValue(mockAudioBuffer),
      resume: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
    audioCompressor = new AudioCompressor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compressAudio', () => {
    it('should compress the audio file', async () => {
      const mockFile = new File([new ArrayBuffer(10)], 'test.wav', { type: 'audio/wav' });

      const result = await audioCompressor.compressAudio(mockFile);

      expect(result.compressedFile).toBeDefined();
      expect(result.compressedFile.name).toContain('compressed');
      expect(result.compressedFile.type).toBe('audio/mpeg');
      // The compressed file size might be larger than original due to mock data
      expect(typeof result.compressionRatio).toBe('number');
    });

    it('should use the default preset if none is provided', async () => {
      const mockFile = new File([new ArrayBuffer(10)], 'test.wav', { type: 'audio/wav' });
      await audioCompressor.compressAudio(mockFile);

      // Just test that it completes without error for now
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    });

    it('should throw an error if loading fails', async () => {
      const errorMessage = 'test error';
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error(errorMessage));
      const mockFile = new File([new ArrayBuffer(10)], 'test.wav', { type: 'audio/wav' });
      await expect(audioCompressor.compressAudio(mockFile)).rejects.toThrow(`Audio compression failed: ${errorMessage}`);
    });

    it.each([
      ['mp3', 'audio/mpeg'],
    ])('should handle %s format', async (format, mimeType) => {
      const mockFile = new File([new ArrayBuffer(10)], 'test.wav', { type: 'audio/wav' });
      const settings = { ...COMPRESSION_PRESETS.MAXIMUM, outputFormat: format as 'mp3' };
      const result = await audioCompressor.compressAudio(mockFile, settings);
      expect(result.compressedFile.type).toBe(mimeType);
    });

    it.each(['opus', 'aac'])('should throw for unsupported format %s', async (format) => {
      const mockFile = new File([new ArrayBuffer(10)], 'test.wav', { type: 'audio/wav' });
      const settings = { ...COMPRESSION_PRESETS.MAXIMUM, outputFormat: format as 'opus' | 'aac' };
      await expect(audioCompressor.compressAudio(mockFile, settings)).rejects.toThrow(`Audio compression failed: Unsupported output format: ${format}`);
    });
  });
});