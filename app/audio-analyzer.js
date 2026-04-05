const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Audio analysis functions using ffmpeg
class ServerAudioAnalyzer {
  constructor() {
    this.ffmpegPath = 'ffmpeg'; // Assume ffmpeg is in PATH
  }

  /**
   * Get audio file metadata using ffprobe
   * @param {string} filePath - Path to audio file
   * @returns {Promise<Object>} Audio metadata
   */
  async getAudioMetadata(filePath) {
    return new Promise((resolve, reject) => {
      const ffprobeCmd = `${this.ffmpegPath} -v quiet -print_format json -show_format -show_streams "${filePath}"`;
      
      exec(ffprobeCmd, (error, stdout, stderr) => {
        if (error) {
          console.error('FFprobe error:', error);
          // Fallback to basic file info
          resolve(this.getBasicFileInfo(filePath));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          const format = result.format || {};
          const stream = (result.streams || []).find(s => s.codec_type === 'audio') || {};
          
          const metadata = {
            duration: parseFloat(format.duration) || null,
            fileSize: parseInt(format.size) || fs.statSync(filePath).size,
            sampleRate: parseInt(stream.sample_rate) || null,
            channels: parseInt(stream.channels) || null,
            codec: stream.codec_name || 'unknown',
            bitrate: parseInt(format.bit_rate) || null,
            fileName: path.basename(filePath),
            analyzedAt: Date.now()
          };
          
          resolve(metadata);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          resolve(this.getBasicFileInfo(filePath));
        }
      });
    });
  }

  /**
   * Generate waveform peaks using ffmpeg
   * @param {string} filePath - Path to audio file
   * @param {number} peakCount - Number of peaks to generate
   * @returns {Promise<Array<number>>} Array of peak amplitudes
   */
  async generateWaveformPeaks(filePath, peakCount = 1000) {
    return new Promise((resolve, reject) => {
      // Use ffmpeg to extract audio samples and generate peaks
      const tempOutput = path.join(path.dirname(filePath), `waveform_${Date.now()}.txt`);
      
      // Command to extract normalized audio samples
      const ffmpegCmd = `${this.ffmpegPath} -i "${filePath}" -filter_complex "aformat=sample_fmts=s16:channel_layouts=mono,aresample=8000,compand=.3|.3:1|1:-90/-60|-60/-40|-40/-30|-20/-20:-90:0.2" -f s16le -acodec pcm_s16le -ar 8000 -ac 1 -y "${tempOutput}"`;
      
      exec(ffmpegCmd, async (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg waveform error:', error);
          // Return fallback peaks
          resolve(this.generateFallbackPeaks(peakCount));
          return;
        }
        
        try {
          // Read the generated audio data and create peaks
          if (fs.existsSync(tempOutput)) {
            const buffer = fs.readFileSync(tempOutput);
            const peaks = this.calculatePeaksFromBuffer(buffer, peakCount);
            
            // Clean up temporary file
            fs.unlinkSync(tempOutput);
            resolve(peaks);
          } else {
            resolve(this.generateFallbackPeaks(peakCount));
          }
        } catch (readError) {
          console.error('Waveform read error:', readError);
          if (fs.existsSync(tempOutput)) {
            fs.unlinkSync(tempOutput);
          }
          resolve(this.generateFallbackPeaks(peakCount));
        }
      });
    });
  }

  /**
   * Calculate peaks from audio buffer
   * @param {Buffer} buffer - Audio buffer data
   * @param {number} peakCount - Number of peaks to generate
   * @returns {Array<number>} Peak amplitudes (0-1)
   */
  calculatePeaksFromBuffer(buffer, peakCount) {
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    const samplesPerPeak = Math.ceil(samples.length / peakCount);
    const peaks = [];
    
    for (let i = 0; i < peakCount; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, samples.length);
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const value = Math.abs(samples[j]) / 32768; // Normalize to 0-1
        if (value > max) max = value;
      }
      
      peaks.push(Math.min(1, max)); // Ensure values are <= 1
    }
    
    return peaks;
  }

  /**
   * Generate fallback peaks when analysis fails
   * @param {number} peakCount - Number of peaks to generate
   * @returns {Array<number>} Simple sine wave pattern
   */
  generateFallbackPeaks(peakCount) {
    const peaks = [];
    for (let i = 0; i < peakCount; i++) {
      // Simple sine wave pattern for fallback
      peaks.push(Math.abs(Math.sin(i / peakCount * Math.PI * 4)) * 0.8 + 0.2);
    }
    return peaks;
  }

  /**
   * Get basic file info as fallback
   * @param {string} filePath - Path to file
   * @returns {Object} Basic file information
   */
  getBasicFileInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath).toLowerCase();
      
      // Estimate duration based on file size and extension
      let estimatedDuration = 240; // Default 4 minutes
      if (stats.size > 0) {
        if (fileName.endsWith('.wav') || fileName.endsWith('.aif') || fileName.endsWith('.aiff')) {
          estimatedDuration = Math.max(30, stats.size / (5.17 * 1024 * 1024) * 60);
        } else if (fileName.endsWith('.flac')) {
          estimatedDuration = Math.max(30, stats.size / (2.85 * 1024 * 1024) * 60);
        } else if (fileName.endsWith('.m4a') || fileName.endsWith('.mp4')) {
          estimatedDuration = Math.max(30, stats.size / (1.12 * 1024 * 1024) * 60);
        } else if (fileName.endsWith('.ogg')) {
          estimatedDuration = Math.max(30, stats.size / (1.0 * 1024 * 1024) * 60);
        } else {
          estimatedDuration = Math.max(30, stats.size / (1.07 * 1024 * 1024) * 60);
        }
      }
      
      return {
        duration: estimatedDuration,
        fileSize: stats.size,
        sampleRate: null,
        channels: null,
        codec: 'unknown',
        bitrate: null,
        fileName: path.basename(filePath),
        analyzedAt: Date.now(),
        analysisError: 'ffprobe unavailable'
      };
    } catch (error) {
      console.error('Basic file info error:', error);
      return {
        duration: 240,
        fileSize: 0,
        sampleRate: null,
        channels: null,
        codec: 'unknown',
        bitrate: null,
        fileName: path.basename(filePath),
        analyzedAt: Date.now(),
        analysisError: 'file access error'
      };
    }
  }

  /**
   * Analyze audio file and return complete metadata with waveform data
   * @param {string} filePath - Path to audio file
   * @param {number} peakCount - Number of waveform peaks to generate
   * @returns {Promise<Object>} Complete audio analysis
   */
  async analyzeAudioFile(filePath, peakCount = 1000) {
    try {
      const metadata = await this.getAudioMetadata(filePath);
      const peaks = await this.generateWaveformPeaks(filePath, peakCount);
      
      return {
        ...metadata,
        waveformPeaks: peaks,
        success: true
      };
    } catch (error) {
      console.error('Audio analysis failed:', error);
      return {
        duration: 240,
        fileSize: 0,
        sampleRate: null,
        channels: null,
        codec: 'unknown',
        bitrate: null,
        fileName: path.basename(filePath),
        analyzedAt: Date.now(),
        waveformPeaks: this.generateFallbackPeaks(peakCount),
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ServerAudioAnalyzer;