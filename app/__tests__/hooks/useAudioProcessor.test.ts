import { renderHook, act } from '@testing-library/react';
import { useAudioProcessor } from '@/hooks/useAudioProcessor';

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

  connect(): void {}
  start(): void {}
  stop(): void {}
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

  createBuffer(channels: number, length: number, sampleRate: number): AudioBuffer {
    return new MockAudioBuffer(channels, length, sampleRate) as unknown as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    return new MockAudioBufferSourceNode() as unknown as AudioBufferSourceNode;
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
    return Promise.resolve();
  }
}

// グローバルなモックコンストラクタ
let mockAudioContextInstance: MockAudioContext | null = null;
const MockAudioContextConstructor = jest.fn(() => {
  mockAudioContextInstance = new MockAudioContext();
  return mockAudioContextInstance;
});

// モックのセットアップ
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

describe('useAudioProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioContextInstance = null;
  });

  describe('初期状態', () => {
    it('初期状態ではaudioBufferがnullである', () => {
      const { result } = renderHook(() => useAudioProcessor());

      expect(result.current.audioBuffer).toBeNull();
      expect(result.current.reversedBuffer).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('AudioContext初期化', () => {
    it('initializeAudioContextでAudioContextが初期化される', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.initializeAudioContext();
      });

      expect(MockAudioContextConstructor).toHaveBeenCalled();
    });

    it('既に初期化されている場合は再初期化しない', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.initializeAudioContext();
      });

      const callCountAfterFirst = MockAudioContextConstructor.mock.calls.length;

      await act(async () => {
        await result.current.initializeAudioContext();
      });

      expect(MockAudioContextConstructor.mock.calls.length).toBe(callCountAfterFirst);
    });
  });

  describe('サイン波サンプル音源の生成', () => {
    it('loadSampleAudioで5秒間のサイン波AudioBufferを生成する', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      expect(result.current.audioBuffer).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('サンプル音源ロード完了後にreversedBufferも生成される', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      expect(result.current.reversedBuffer).not.toBeNull();
    });
  });

  describe('音声ファイルのロードとデコード', () => {
    it('loadAudioFileでファイルをロードしてデコードする', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      const mockArrayBuffer = new ArrayBuffer(1024);
      const mockFile = new File([mockArrayBuffer], 'test.wav', { type: 'audio/wav' });

      // FileReader.prototype.readAsArrayBufferをモック
      const originalFileReader = global.FileReader;
      const mockFileReaderInstance = {
        readAsArrayBuffer: jest.fn(function(this: { onload?: (e: ProgressEvent<FileReader>) => void; result: ArrayBuffer }) {
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

    it('ファイルロード失敗時はerrorがセットされる', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      const mockFile = new File(['test'], 'test.wav', { type: 'audio/wav' });

      // FileReaderがエラーを発生させるようにモック
      const originalFileReader = global.FileReader;
      const mockFileReaderInstance = {
        readAsArrayBuffer: jest.fn(function(this: { onerror?: (e: ProgressEvent<FileReader>) => void }) {
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

  describe('逆再生用AudioBufferの生成', () => {
    it('loadSampleAudio後にreversedBufferが生成されている', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      expect(result.current.reversedBuffer).not.toBeNull();
    });
  });

  describe('再生パラメータ計算', () => {
    describe('calculateDurationRate', () => {
      it('キャンバス幅の半分の線の長さで1.0（元の長さ）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 800, distance = 400 (半分) → durationRate = 1.0
        expect(result.current.calculateDurationRate(400, 800)).toBe(1.0);
      });

      it('キャンバス幅と同じ線の長さで2.0（2倍の長さ）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 800, distance = 800 → durationRate = 2.0
        expect(result.current.calculateDurationRate(800, 800)).toBe(2.0);
      });

      it('キャンバス幅の1/4の線の長さで0.5（半分の長さ）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 800, distance = 200 (1/4) → durationRate = 0.5
        expect(result.current.calculateDurationRate(200, 800)).toBe(0.5);
      });

      it('0pxの線の長さで0を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculateDurationRate(0, 800)).toBe(0);
      });

      it('キャンバス幅が0以下の場合はデフォルト値800を使用する', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 0, distance = 400 → デフォルト800を使用 → 400/400 = 1.0
        expect(result.current.calculateDurationRate(400, 0)).toBe(1.0);
        expect(result.current.calculateDurationRate(400, -100)).toBe(1.0);
      });

      it('異なるキャンバスサイズでも線形比率を維持する', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 1200, distance = 600 (半分) → durationRate = 1.0
        expect(result.current.calculateDurationRate(600, 1200)).toBe(1.0);
        // canvasWidth = 400, distance = 200 (半分) → durationRate = 1.0
        expect(result.current.calculateDurationRate(200, 400)).toBe(1.0);
      });
    });

    describe('calculatePitchRate', () => {
      it('キャンバス中央（normalizedY = 0）で1.0を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculatePitchRate(0)).toBe(1.0);
      });

      it('キャンバス上端（normalizedY = -1）で0.25を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculatePitchRate(-1)).toBeCloseTo(0.25, 5);
      });

      it('キャンバス下端（normalizedY = 1）で4.0を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculatePitchRate(1)).toBeCloseTo(4.0, 5);
      });

      it('ピッチ倍率は0.25から4.0の範囲に制限される', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculatePitchRate(-2)).toBe(0.25);
        expect(result.current.calculatePitchRate(2)).toBe(4.0);
      });
    });

    describe('isReverse判定', () => {
      it('xDeltaが正（右向き）の場合はfalse（順再生）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.isReversePlayback(50)).toBe(false);
      });

      it('xDeltaが負（左向き）の場合はtrue（逆再生）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.isReversePlayback(-50)).toBe(true);
      });

      it('xDeltaが0の場合はfalse（順再生）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.isReversePlayback(0)).toBe(false);
      });
    });
  });

  describe('音声再生', () => {
    it('playAudioで音声を再生する', async () => {
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

    it('再生中はisPlayingがtrueになる', async () => {
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

    it('音声がロードされていない場合はエラーになる', () => {
      const { result } = renderHook(() => useAudioProcessor());

      // AudioContextを初期化せずに再生を試みる
      act(() => {
        result.current.playAudio({
          isReverse: false,
          durationRate: 1.0,
          pitchRate: 1.0,
        });
      });

      expect(result.current.error).not.toBeNull();
    });

    it('逆再生の場合はreversedBufferが使用される', async () => {
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

    it('stopAudioで再生を停止できる', async () => {
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
  });
});
