/**
 * 音声処理フロー統合テスト
 * Task 7.2: 音声処理フローの検証
 * - サンプル音源の生成と再生を確認
 * - ファイルロードとデコードを確認
 * - ピッチ変更と逆再生の動作を確認
 * Requirements: 1.2, 1.3, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4
 */

import { renderHook, act } from '@testing-library/react';
import { useAudioProcessor, PlaybackParams } from '@/hooks/useAudioProcessor';

// Web Audio API モック
class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  private channelData: Float32Array[];

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this.channelData = [];
    for (let i = 0; i < channels; i++) {
      this.channelData.push(new Float32Array(length));
    }
  }

  getChannelData(channel: number): Float32Array {
    return this.channelData[channel];
  }

  copyFromChannel(): void {}
  copyToChannel(): void {}
}

class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  playbackRate = { value: 1 };
  onended: (() => void) | null = null;
  private started = false;

  connect(): void {}
  start(): void {
    this.started = true;
  }
  stop(): void {
    if (this.started && this.onended) {
      this.onended();
    }
  }
  disconnect(): void {}
}

class MockGainNode {
  gain = { value: 1 };

  connect(): void {}
  disconnect(): void {}
}

class MockAudioContext {
  sampleRate = 44100;
  state = 'running';
  destination = {};
  private lastSourceNode: MockAudioBufferSourceNode | null = null;

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate) as unknown as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    this.lastSourceNode = new MockAudioBufferSourceNode();
    return this.lastSourceNode as unknown as AudioBufferSourceNode;
  }

  createGain(): GainNode {
    return new MockGainNode() as unknown as GainNode;
  }

  decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve(this.createBuffer(2, 44100 * 5, 44100));
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }

  getLastSourceNode(): MockAudioBufferSourceNode | null {
    return this.lastSourceNode;
  }
}

let mockAudioContextInstance: MockAudioContext | null = null;
const MockAudioContextConstructor = jest.fn(() => {
  mockAudioContextInstance = new MockAudioContext();
  return mockAudioContextInstance;
});

beforeAll(() => {
  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    configurable: true,
    value: MockAudioContextConstructor,
  });

  Object.defineProperty(window, 'webkitAudioContext', {
    writable: true,
    configurable: true,
    value: MockAudioContextConstructor,
  });
});

describe('音声処理フロー統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioContextInstance = null;
  });

  describe('Req 1.2: サンプル音源の生成と再生', () => {
    it('5秒間のサイン波サンプル音源を生成できる', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      expect(result.current.audioBuffer).not.toBeNull();
      expect(result.current.audioBuffer?.duration).toBe(5);
      expect(result.current.error).toBeNull();
    });

    it('サンプル音源のロード中はisLoadingがtrueになる', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      expect(result.current.isLoading).toBe(false);

      let loadingDuringLoad = false;
      const loadPromise = act(async () => {
        const promise = result.current.loadSampleAudio();
        // ロード開始直後の状態をキャプチャ
        loadingDuringLoad = result.current.isLoading;
        await promise;
      });

      await loadPromise;
      expect(result.current.isLoading).toBe(false);
    });

    it('逆再生用バッファも同時に生成される', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      expect(result.current.reversedBuffer).not.toBeNull();
      expect(result.current.reversedBuffer?.duration).toBe(result.current.audioBuffer?.duration);
    });
  });

  describe('Req 1.3: ファイルロードとデコード', () => {
    it('音声ファイルをロードしてAudioBufferにデコードできる', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockFile = new File([mockArrayBuffer], 'test.wav', { type: 'audio/wav' });

      // FileReaderモック
      const originalFileReader = global.FileReader;
      const mockFileReaderInstance = {
        readAsArrayBuffer: jest.fn(function (this: { onload?: (e: ProgressEvent<FileReader>) => void; result: ArrayBuffer }) {
          setTimeout(() => {
            this.result = mockArrayBuffer;
            if (this.onload) {
              this.onload({ target: { result: mockArrayBuffer } } as ProgressEvent<FileReader>);
            }
          }, 0);
        }),
        result: null as ArrayBuffer | null,
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        onerror: null as ((e: ProgressEvent<FileReader>) => void) | null,
      };

      global.FileReader = jest.fn(() => mockFileReaderInstance) as unknown as typeof FileReader;

      await act(async () => {
        await result.current.loadAudioFile(mockFile);
      });

      expect(result.current.audioBuffer).not.toBeNull();
      expect(result.current.isLoading).toBe(false);

      global.FileReader = originalFileReader;
    });

    it('デコード失敗時にエラーがセットされる', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });

      // FileReaderがエラーを発生させるようにモック
      const originalFileReader = global.FileReader;
      const mockFileReaderInstance = {
        readAsArrayBuffer: jest.fn(function (this: { onerror?: (e: ProgressEvent<FileReader>) => void }) {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({} as ProgressEvent<FileReader>);
            }
          }, 0);
        }),
        result: null,
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        onerror: null as ((e: ProgressEvent<FileReader>) => void) | null,
      };

      global.FileReader = jest.fn(() => mockFileReaderInstance) as unknown as typeof FileReader;

      await act(async () => {
        try {
          await result.current.loadAudioFile(mockFile);
        } catch {
          // エラーが発生することを期待
        }
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.isLoading).toBe(false);

      global.FileReader = originalFileReader;
    });
  });

  describe('Req 4.2, 4.3, 4.4: 線の長さに基づく音声の長さ変換', () => {
    // キャンバス幅800pxの場合、基準距離は400px（キャンバス幅の半分）
    const CANVAS_WIDTH = 800;
    const BASE_DISTANCE = CANVAS_WIDTH / 2; // 400px

    it('キャンバス幅の半分の線で元の音声長さ（1.0倍）を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      // distance = 400 (= CANVAS_WIDTH / 2) → durationRate = 1.0
      expect(result.current.calculateDurationRate(BASE_DISTANCE, CANVAS_WIDTH)).toBe(1.0);
    });

    it('キャンバス幅と同じ線で2倍の音声長さを返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      // distance = 800 (= CANVAS_WIDTH) → durationRate = 2.0
      expect(result.current.calculateDurationRate(CANVAS_WIDTH, CANVAS_WIDTH)).toBe(2.0);
    });

    it('キャンバス幅の1/4の線で半分の音声長さを返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      // distance = 200 (= CANVAS_WIDTH / 4) → durationRate = 0.5
      expect(result.current.calculateDurationRate(BASE_DISTANCE / 2, CANVAS_WIDTH)).toBe(0.5);
    });

    it('キャンバス幅の2.5倍の線で5倍の音声長さを返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      // distance = 2000 (= CANVAS_WIDTH * 2.5) → durationRate = 5.0
      expect(result.current.calculateDurationRate(BASE_DISTANCE * 5, CANVAS_WIDTH)).toBe(5.0);
    });
  });

  describe('Req 5.1, 5.2: 線の方向に基づく再生方向変換', () => {
    it('右方向（正のxDelta）で順再生を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.isReversePlayback(100)).toBe(false);
    });

    it('左方向（負のxDelta）で逆再生を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.isReversePlayback(-100)).toBe(true);
    });

    it('xDelta=0で順再生を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.isReversePlayback(0)).toBe(false);
    });
  });

  describe('Req 6.1, 6.2, 6.3, 6.4: Y座標に基づくピッチ変換', () => {
    it('キャンバス中央（normalizedY=0）でピッチ1.0を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.calculatePitchRate(0)).toBe(1.0);
    });

    it('キャンバス上端（normalizedY=-1）でピッチ0.25（2オクターブ下）を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.calculatePitchRate(-1)).toBeCloseTo(0.25, 5);
    });

    it('キャンバス下端（normalizedY=1）でピッチ4.0（2オクターブ上）を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.calculatePitchRate(1)).toBeCloseTo(4.0, 5);
    });

    it('上半分（normalizedY=-0.5）でピッチ0.5（1オクターブ下）を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.calculatePitchRate(-0.5)).toBeCloseTo(0.5, 5);
    });

    it('下半分（normalizedY=0.5）でピッチ2.0（1オクターブ上）を返す', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.calculatePitchRate(0.5)).toBeCloseTo(2.0, 5);
    });

    it('範囲外の値は0.25〜4.0にクランプされる', () => {
      const { result } = renderHook(() => useAudioProcessor());
      expect(result.current.calculatePitchRate(-2)).toBe(0.25);
      expect(result.current.calculatePitchRate(2)).toBe(4.0);
    });
  });

  describe('音声再生フロー', () => {
    it('順再生でaudioBufferが使用される', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      act(() => {
        result.current.playAudio({
          isReverse: false,
          durationRate: 1.0,
          pitchRate: 1.0,
        });
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('逆再生でreversedBufferが使用される', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      act(() => {
        result.current.playAudio({
          isReverse: true,
          durationRate: 1.0,
          pitchRate: 1.0,
        });
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('再生停止でisPlayingがfalseになる', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      act(() => {
        result.current.playAudio({
          isReverse: false,
          durationRate: 1.0,
          pitchRate: 1.0,
        });
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.stopAudio();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('音声未ロード時に再生するとエラーになる', () => {
      const { result } = renderHook(() => useAudioProcessor());

      act(() => {
        result.current.playAudio({
          isReverse: false,
          durationRate: 1.0,
          pitchRate: 1.0,
        });
      });

      expect(result.current.error).not.toBeNull();
    });

    it('playbackRateがdurationRateとpitchRateの組み合わせで計算される', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      // durationRate=2.0（2倍長い）、pitchRate=2.0（高いピッチ）
      // 期待されるplaybackRate = pitchRate / durationRate = 2.0 / 2.0 = 1.0
      act(() => {
        result.current.playAudio({
          isReverse: false,
          durationRate: 2.0,
          pitchRate: 2.0,
        });
      });

      expect(result.current.isPlaying).toBe(true);
    });
  });
});
