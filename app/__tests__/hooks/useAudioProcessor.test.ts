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
  playbackRate = { value: 1, setValueCurveAtTime: jest.fn() };
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

  describe('再生パラメータ計算', () => {
    describe('calculateDurationRate', () => {
      it('キャンバス幅の半分の軌跡総線分長で1.0（元の長さ）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 800, pathLength = 400 (半分) → durationRate = 1.0
        expect(result.current.calculateDurationRate(400, 800)).toBe(1.0);
      });

      it('キャンバス幅と同じ軌跡総線分長で2.0（2倍の長さ）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 800, pathLength = 800 → durationRate = 2.0
        expect(result.current.calculateDurationRate(800, 800)).toBe(2.0);
      });

      it('キャンバス幅の1/4の軌跡総線分長で0.5（半分の長さ）を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 800, pathLength = 200 (1/4) → durationRate = 0.5
        expect(result.current.calculateDurationRate(200, 800)).toBe(0.5);
      });

      it('0pxの軌跡総線分長で0を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculateDurationRate(0, 800)).toBe(0);
      });

      it('キャンバス幅が0以下の場合はデフォルト値800を使用する', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 0, pathLength = 400 → デフォルト800を使用 → 400/400 = 1.0
        expect(result.current.calculateDurationRate(400, 0)).toBe(1.0);
        expect(result.current.calculateDurationRate(400, -100)).toBe(1.0);
      });

      it('異なるキャンバスサイズでも線形比率を維持する', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasWidth = 1200, pathLength = 600 (半分) → durationRate = 1.0
        expect(result.current.calculateDurationRate(600, 1200)).toBe(1.0);
        // canvasWidth = 400, pathLength = 200 (半分) → durationRate = 1.0
        expect(result.current.calculateDurationRate(200, 400)).toBe(1.0);
      });

      it('曲線軌跡は直線より長い総線分長を持つため、より長い再生時間倍率を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // 曲線軌跡: 始点(0,0)→終点(400,0)の直線距離=400
        // 曲線を通ると仮定した総線分長=600
        const straightDistance = 400;
        const curvePathLength = 600;
        const canvasWidth = 800;

        const straightDuration = result.current.calculateDurationRate(straightDistance, canvasWidth);
        const curveDuration = result.current.calculateDurationRate(curvePathLength, canvasWidth);

        // 曲線軌跡の方が長い再生時間倍率を持つ
        expect(curveDuration).toBeGreaterThan(straightDuration);
        // 直線: 400/400 = 1.0, 曲線: 600/400 = 1.5
        expect(straightDuration).toBe(1.0);
        expect(curveDuration).toBe(1.5);
      });
    });

    describe('calculatePitchRate（旧API - 後方互換性）', () => {
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

    describe('calculatePitchFromY（新API - Y座標ベース）', () => {
      it('キャンバス上端（Y=0）で最大ピッチ5.0を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculatePitchFromY(0, 600)).toBe(5.0);
      });

      it('キャンバス下端（Y=canvasHeight）で最小ピッチ1.0を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculatePitchFromY(600, 600)).toBe(1.0);
      });

      it('キャンバス中央（Y=canvasHeight/2）で中間ピッチ3.0を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        expect(result.current.calculatePitchFromY(300, 600)).toBe(3.0);
      });

      it('Y座標とピッチの関係が線形である', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const canvasHeight = 600;
        // Y=150 (1/4) → 5.0 - (0.25 * 4.0) = 4.0
        expect(result.current.calculatePitchFromY(150, canvasHeight)).toBe(4.0);
        // Y=450 (3/4) → 5.0 - (0.75 * 4.0) = 2.0
        expect(result.current.calculatePitchFromY(450, canvasHeight)).toBe(2.0);
      });

      it('ピッチ値を1.0〜5.0の範囲にクランプする', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // 負のY座標は5.0にクランプ
        expect(result.current.calculatePitchFromY(-100, 600)).toBe(5.0);
        // canvasHeightを超えるY座標は1.0にクランプ
        expect(result.current.calculatePitchFromY(700, 600)).toBe(1.0);
      });

      it('canvasHeightが0以下の場合はデフォルト値を使用する', () => {
        const { result } = renderHook(() => useAudioProcessor());
        // canvasHeight=0の場合、デフォルトの600を想定
        // Y=0はピッチ5.0を返す
        expect(result.current.calculatePitchFromY(0, 0)).toBe(5.0);
        expect(result.current.calculatePitchFromY(0, -100)).toBe(5.0);
      });
    });

    describe('generatePitchCurve（ピッチ曲線生成）', () => {
      it('軌跡からFloat32Arrayを返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const path = [
          { x: 0, y: 0 },
          { x: 100, y: 300 },
          { x: 200, y: 600 },
        ];
        const pitchCurve = result.current.generatePitchCurve(path, 600);
        expect(pitchCurve).toBeInstanceOf(Float32Array);
      });

      it('デフォルトで100サンプルを生成する', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const path = [
          { x: 0, y: 0 },
          { x: 100, y: 300 },
          { x: 200, y: 600 },
        ];
        const pitchCurve = result.current.generatePitchCurve(path, 600);
        expect(pitchCurve.length).toBe(100);
      });

      it('指定したサンプル数で生成できる', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const path = [
          { x: 0, y: 0 },
          { x: 100, y: 600 },
        ];
        const pitchCurve = result.current.generatePitchCurve(path, 600, 50);
        expect(pitchCurve.length).toBe(50);
      });

      it('全ての値が1.0〜5.0の範囲内である', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const path = [
          { x: 0, y: -100 }, // 範囲外（上）
          { x: 100, y: 300 },
          { x: 200, y: 700 }, // 範囲外（下）
        ];
        const pitchCurve = result.current.generatePitchCurve(path, 600);
        for (let i = 0; i < pitchCurve.length; i++) {
          expect(pitchCurve[i]).toBeGreaterThanOrEqual(1.0);
          expect(pitchCurve[i]).toBeLessThanOrEqual(5.0);
        }
      });

      it('上端から下端への軌跡は高音から低音へのピッチ曲線を生成', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const path = [
          { x: 0, y: 0 },   // 上端 → 5.0
          { x: 100, y: 600 }, // 下端 → 1.0
        ];
        const pitchCurve = result.current.generatePitchCurve(path, 600, 10);
        // 最初のピッチは5.0に近く、最後は1.0に近い
        expect(pitchCurve[0]).toBeCloseTo(5.0, 1);
        expect(pitchCurve[pitchCurve.length - 1]).toBeCloseTo(1.0, 1);
        // ピッチは減少していく
        expect(pitchCurve[0]).toBeGreaterThan(pitchCurve[pitchCurve.length - 1]);
      });

      it('下端から上端への軌跡は低音から高音へのピッチ曲線を生成', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const path = [
          { x: 0, y: 600 },  // 下端 → 1.0
          { x: 100, y: 0 },  // 上端 → 5.0
        ];
        const pitchCurve = result.current.generatePitchCurve(path, 600, 10);
        // 最初のピッチは1.0に近く、最後は5.0に近い
        expect(pitchCurve[0]).toBeCloseTo(1.0, 1);
        expect(pitchCurve[pitchCurve.length - 1]).toBeCloseTo(5.0, 1);
        // ピッチは増加していく
        expect(pitchCurve[0]).toBeLessThan(pitchCurve[pitchCurve.length - 1]);
      });

      it('空の軌跡の場合は中間ピッチ3.0で満たされた配列を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const pitchCurve = result.current.generatePitchCurve([], 600, 10);
        expect(pitchCurve.length).toBe(10);
        for (let i = 0; i < pitchCurve.length; i++) {
          expect(pitchCurve[i]).toBe(3.0);
        }
      });

      it('1点のみの軌跡の場合はその点のピッチで満たされた配列を返す', () => {
        const { result } = renderHook(() => useAudioProcessor());
        const path = [{ x: 0, y: 300 }]; // 中央 → 3.0
        const pitchCurve = result.current.generatePitchCurve(path, 600, 10);
        expect(pitchCurve.length).toBe(10);
        for (let i = 0; i < pitchCurve.length; i++) {
          expect(pitchCurve[i]).toBeCloseTo(3.0, 1);
        }
      });
    });

  });

  describe('動的ピッチ再生（playAudioWithDynamicPitch）', () => {
    it('動的ピッチで音声を再生する', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      const pitchCurve = new Float32Array([5.0, 4.0, 3.0, 2.0, 1.0]);
      act(() => {
        result.current.playAudioWithDynamicPitch({
          durationRate: 1.0,
          pitchCurve,
          duration: 5.0,
        });
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('AudioBufferがない場合はエラーを設定する', () => {
      const { result } = renderHook(() => useAudioProcessor());

      const pitchCurve = new Float32Array([3.0, 3.0, 3.0]);
      act(() => {
        result.current.playAudioWithDynamicPitch({
          durationRate: 1.0,
          pitchCurve,
          duration: 5.0,
        });
      });

      expect(result.current.error).not.toBeNull();
    });

    it('setValueCurveAtTimeを使用してピッチ曲線を適用する', async () => {
      const setValueCurveAtTimeMock = jest.fn();

      // MockAudioBufferSourceNodeにsetValueCurveAtTimeを追加
      const originalCreateBufferSource = MockAudioContext.prototype.createBufferSource;
      MockAudioContext.prototype.createBufferSource = function() {
        const source = originalCreateBufferSource.call(this);
        source.playbackRate = {
          value: 1,
          setValueCurveAtTime: setValueCurveAtTimeMock,
        };
        return source;
      };

      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      const pitchCurve = new Float32Array([5.0, 3.0, 1.0]);
      act(() => {
        result.current.playAudioWithDynamicPitch({
          durationRate: 1.0,
          pitchCurve,
          duration: 5.0,
        });
      });

      expect(setValueCurveAtTimeMock).toHaveBeenCalled();
      const callArgs = setValueCurveAtTimeMock.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Float32Array);
      expect(callArgs[0].length).toBe(3);

      // モックを元に戻す
      MockAudioContext.prototype.createBufferSource = originalCreateBufferSource;
    });

    it('durationRateに基づいて再生時間を計算する', async () => {
      const startMock = jest.fn();

      const originalCreateBufferSource = MockAudioContext.prototype.createBufferSource;
      MockAudioContext.prototype.createBufferSource = function() {
        const source = originalCreateBufferSource.call(this);
        source.playbackRate = {
          value: 1,
          setValueCurveAtTime: jest.fn(),
        };
        source.start = startMock;
        return source;
      };

      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      const pitchCurve = new Float32Array([3.0, 3.0, 3.0]);
      act(() => {
        result.current.playAudioWithDynamicPitch({
          durationRate: 0.5,
          pitchCurve,
          duration: 2.5, // 5秒の半分
        });
      });

      expect(startMock).toHaveBeenCalled();
      // start(when, offset, duration)の3番目の引数がduration
      const callArgs = startMock.mock.calls[0];
      expect(callArgs[2]).toBeLessThanOrEqual(2.5);

      MockAudioContext.prototype.createBufferSource = originalCreateBufferSource;
    });
  });

  describe('静的ピッチ再生（playAudioWithStaticPitch）', () => {
    it('静的ピッチで音声を再生する', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      act(() => {
        result.current.playAudioWithStaticPitch({
          durationRate: 1.0,
          pitchRate: 2.5,
        });
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('AudioBufferがない場合はエラーを設定する', () => {
      const { result } = renderHook(() => useAudioProcessor());

      act(() => {
        result.current.playAudioWithStaticPitch({
          durationRate: 1.0,
          pitchRate: 2.5,
        });
      });

      expect(result.current.error).not.toBeNull();
    });

    it('指定されたpitchRateをplaybackRateに設定する', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      // 新たなモック設定
      let capturedPlaybackRate = 0;
      const originalCreateBufferSource = MockAudioContext.prototype.createBufferSource;
      MockAudioContext.prototype.createBufferSource = function() {
        const source = originalCreateBufferSource.call(this);
        const playbackRate = {
          _value: 1,
          get value() { return this._value; },
          set value(v: number) { capturedPlaybackRate = v; this._value = v; },
        };
        Object.defineProperty(source, 'playbackRate', { value: playbackRate });
        return source;
      };

      act(() => {
        result.current.playAudioWithStaticPitch({
          durationRate: 1.0,
          pitchRate: 3.5,
        });
      });

      expect(capturedPlaybackRate).toBe(3.5);

      MockAudioContext.prototype.createBufferSource = originalCreateBufferSource;
    });

    it('常に順再生（audioBufferを使用）する', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      let usedBuffer: AudioBuffer | null = null;
      const originalCreateBufferSource = MockAudioContext.prototype.createBufferSource;
      MockAudioContext.prototype.createBufferSource = function() {
        const source = originalCreateBufferSource.call(this);
        Object.defineProperty(source, 'buffer', {
          set(v) { usedBuffer = v; },
          get() { return usedBuffer; },
        });
        return source;
      };

      act(() => {
        result.current.playAudioWithStaticPitch({
          durationRate: 1.0,
          pitchRate: 2.0,
        });
      });

      // audioBuffer（順再生用）が使用されている
      expect(usedBuffer).toBe(result.current.audioBuffer);

      MockAudioContext.prototype.createBufferSource = originalCreateBufferSource;
    });
  });

  describe('stopAudio', () => {
    it('stopAudioで再生を停止できる', async () => {
      const { result } = renderHook(() => useAudioProcessor());

      await act(async () => {
        await result.current.loadSampleAudio();
      });

      act(() => {
        result.current.playAudioWithStaticPitch({
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
