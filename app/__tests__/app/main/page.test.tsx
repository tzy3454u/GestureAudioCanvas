/**
 * メインページコンポーネントテスト
 * TDD: RED → GREEN → REFACTOR
 * Requirements: 1.1, 1.5, 2.1, 2.3, 8.4
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainPage from '@/app/main/page';

// useAuthのモック
const mockUseAuth = {
  user: { uid: 'test-uid', email: 'test@example.com' },
  isLoading: false,
  isAuthenticated: true,
  error: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  clearError: jest.fn(),
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// useRouterのモック
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// useAudioProcessorのモック
const mockPlayAudioWithDynamicPitch = jest.fn();
const mockPlayAudioWithStaticPitch = jest.fn();
const mockLoadSampleAudio = jest.fn();
const mockLoadAudioFile = jest.fn();
const mockInitializeAudioContext = jest.fn();

const mockCalculateDurationRate = jest.fn((pathLength: number, canvasWidth: number) => {
  const baseDistance = canvasWidth / 2;
  return pathLength / baseDistance;
});

const mockCalculatePitchFromY = jest.fn((y: number, canvasHeight: number) => {
  const normalizedY = Math.max(0, Math.min(1, y / canvasHeight));
  return 5.0 - (normalizedY * 4.0);
});

const mockGeneratePitchCurve = jest.fn((path: Array<{x: number; y: number}>, canvasHeight: number, sampleCount = 100) => {
  return new Float32Array(sampleCount).fill(3.0);
});

const mockUseAudioProcessor = {
  audioBuffer: null,
  isLoading: false,
  isPlaying: false,
  error: null,
  volume: 0.5,
  initializeAudioContext: mockInitializeAudioContext,
  loadAudioFile: mockLoadAudioFile,
  loadSampleAudio: mockLoadSampleAudio,
  setAudioBufferExternal: jest.fn(),
  stopAudio: jest.fn(),
  setVolumeLevel: jest.fn(),
  calculateDurationRate: mockCalculateDurationRate,
  calculatePitchRate: jest.fn((normalizedY: number) => Math.pow(2, normalizedY * 2)),
  calculatePitchFromY: mockCalculatePitchFromY,
  generatePitchCurve: mockGeneratePitchCurve,
  playAudioWithDynamicPitch: mockPlayAudioWithDynamicPitch,
  playAudioWithStaticPitch: mockPlayAudioWithStaticPitch,
};

jest.mock('@/hooks/useAudioProcessor', () => ({
  useAudioProcessor: () => mockUseAudioProcessor,
}));

// useGestureCanvasのモック
const mockClearCanvas = jest.fn();
const mockHandlePointerUp = jest.fn();

jest.mock('@/hooks/useGestureCanvas', () => ({
  useGestureCanvas: () => ({
    canvasRef: { current: null },
    isDrawing: false,
    currentPath: [],
    handlePointerDown: jest.fn(),
    handlePointerMove: jest.fn(),
    handlePointerUp: mockHandlePointerUp,
    clearCanvas: mockClearCanvas,
    calculateGestureParams: jest.fn(),
    getCanvasPoint: jest.fn(),
  }),
}));

// GestureCanvasモックのonGestureCompleteをキャプチャ
type GestureDataType = {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  path: { x: number; y: number }[];
  distance: number;
  pathLength: number;
  cumulativeDistances: number[];
};
let capturedOnGestureComplete: ((gesture: GestureDataType) => void) | null = null;

jest.mock('@/components/GestureCanvas', () => ({
  GestureCanvas: ({ onGestureComplete, isEnabled, isPlaying }: { onGestureComplete: (gesture: GestureDataType) => void; isEnabled: boolean; isPlaying: boolean }) => {
    capturedOnGestureComplete = onGestureComplete;
    // isPlayingを優先的に表示（再生中テストのため）
    const showOverlay = !isEnabled || isPlaying;
    const overlayMessage = isPlaying ? '再生中...' : (!isEnabled ? '音声をロードしてください' : '');
    return (
      <div data-testid="gesture-canvas">
        {showOverlay && overlayMessage && <span>{overlayMessage}</span>}
      </div>
    );
  },
}));

describe('MainPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.isLoading = false;
    mockUseAudioProcessor.audioBuffer = null;
    mockUseAudioProcessor.isLoading = false;
    mockUseAudioProcessor.isPlaying = false;
    mockUseAudioProcessor.error = null;
    capturedOnGestureComplete = null;
  });

  describe('Task 6.1: メインページのレイアウト構成', () => {
    it('ヘッダーが表示される', () => {
      render(<MainPage />);
      expect(screen.getByText('Gesture Audio Canvas')).toBeInTheDocument();
    });

    it('音声選択UIが表示される', () => {
      render(<MainPage />);
      expect(screen.getByText('音声ソースを選択')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /サンプル音源/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ファイルを選択/i })).toBeInTheDocument();
    });

    it('キャンバスが表示される', () => {
      render(<MainPage />);
      // キャンバスの無効状態オーバーレイテキストで確認
      expect(screen.getByText('音声をロードしてください')).toBeInTheDocument();
    });

    it('レスポンシブ対応のコンテナが使用されている', () => {
      const { container } = render(<MainPage />);
      const mainContainer = container.querySelector('[class*="MuiContainer"]');
      expect(mainContainer).toBeTruthy();
    });
  });

  describe('Task 6.1: 認証ガードでページを保護', () => {
    it('認証済みの場合、メインコンテンツが表示される', () => {
      mockUseAuth.isAuthenticated = true;
      mockUseAuth.isLoading = false;

      render(<MainPage />);
      expect(screen.getByText('音声ソースを選択')).toBeInTheDocument();
    });

    it('未認証の場合、ログイン画面にリダイレクトされる', async () => {
      mockUseAuth.isAuthenticated = false;
      mockUseAuth.isLoading = false;

      render(<MainPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('認証確認中はローディング表示される', () => {
      mockUseAuth.isLoading = true;
      mockUseAuth.isAuthenticated = false;

      render(<MainPage />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Task 6.2: 音声選択からキャンバス有効化への連携', () => {
    it('音声未選択時はキャンバスが無効状態で表示される', () => {
      mockUseAudioProcessor.audioBuffer = null;

      render(<MainPage />);
      expect(screen.getByText('音声をロードしてください')).toBeInTheDocument();
    });

    it('音声ロード完了時にキャンバスが有効化される', async () => {
      // まず音声未ロード状態
      mockUseAudioProcessor.audioBuffer = null;
      const { rerender } = render(<MainPage />);

      expect(screen.getByText('音声をロードしてください')).toBeInTheDocument();

      // 音声がロードされた状態をシミュレート
      const mockBuffer = { duration: 5, sampleRate: 44100 } as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;

      rerender(<MainPage />);

      await waitFor(() => {
        expect(screen.queryByText('音声をロードしてください')).not.toBeInTheDocument();
      });
    });

    it('音声切り替え時に状態がリセットされる', async () => {
      const mockBuffer = { duration: 5, sampleRate: 44100 } as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;

      const { rerender } = render(<MainPage />);

      // 別の音声に切り替え
      mockUseAudioProcessor.audioBuffer = null;
      rerender(<MainPage />);

      expect(screen.getByText('音声をロードしてください')).toBeInTheDocument();
    });
  });

  describe('Task 6.3: ジェスチャーから音声再生への連携（動的ピッチ対応）', () => {
    it('ジェスチャー完了時にpathLengthとパスを使って動的ピッチパラメータを計算して再生をトリガーする', async () => {
      const mockBuffer = { duration: 5, sampleRate: 44100, numberOfChannels: 1, length: 220500, getChannelData: jest.fn() } as unknown as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;

      render(<MainPage />);

      // ジェスチャー完了をシミュレート（pathLengthとパスを含む）
      const gesture: GestureDataType = {
        startPoint: { x: 100, y: 200 },
        endPoint: { x: 500, y: 200 },
        path: [
          { x: 100, y: 200 },
          { x: 300, y: 100 },
          { x: 500, y: 200 },
        ],
        distance: 400,
        pathLength: 450, // 曲線なので直線より長い
        cumulativeDistances: [0, 250, 450],
      };

      act(() => {
        if (capturedOnGestureComplete) {
          capturedOnGestureComplete(gesture);
        }
      });

      // playAudioWithDynamicPitchが呼ばれることを検証
      expect(mockPlayAudioWithDynamicPitch).toHaveBeenCalled();
    });

    it('calculateDurationRateにpathLength（総線分長）とキャンバス幅を渡す', () => {
      const mockBuffer = { duration: 5, sampleRate: 44100, numberOfChannels: 1, length: 220500, getChannelData: jest.fn() } as unknown as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;

      render(<MainPage />);

      // ジェスチャー完了をシミュレート
      const gesture: GestureDataType = {
        startPoint: { x: 100, y: 200 },
        endPoint: { x: 500, y: 200 },
        path: [
          { x: 100, y: 200 },
          { x: 300, y: 100 },
          { x: 500, y: 200 },
        ],
        distance: 400,
        pathLength: 450,
        cumulativeDistances: [0, 250, 450],
      };

      act(() => {
        if (capturedOnGestureComplete) {
          capturedOnGestureComplete(gesture);
        }
      });

      // calculateDurationRateがpathLength=450, canvasWidth=800で呼ばれることを検証
      expect(mockCalculateDurationRate).toHaveBeenCalledWith(450, 800);
    });

    it('generatePitchCurveにパスとキャンバス高さを渡してピッチ曲線を生成する', () => {
      const mockBuffer = { duration: 5, sampleRate: 44100, numberOfChannels: 1, length: 220500, getChannelData: jest.fn() } as unknown as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;

      render(<MainPage />);

      const path = [
        { x: 100, y: 200 },
        { x: 300, y: 100 },
        { x: 500, y: 200 },
      ];

      const gesture: GestureDataType = {
        startPoint: { x: 100, y: 200 },
        endPoint: { x: 500, y: 200 },
        path,
        distance: 400,
        pathLength: 450,
        cumulativeDistances: [0, 250, 450],
      };

      act(() => {
        if (capturedOnGestureComplete) {
          capturedOnGestureComplete(gesture);
        }
      });

      // generatePitchCurveがパスとキャンバス高さ（CANVAS_HEIGHT=400）で呼ばれることを検証
      expect(mockGeneratePitchCurve).toHaveBeenCalledWith(path, 400);
    });

    it('X座標の方向に関わらず常に順再生する（逆再生なし）', () => {
      const mockBuffer = { duration: 5, sampleRate: 44100, numberOfChannels: 1, length: 220500, getChannelData: jest.fn() } as unknown as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;

      render(<MainPage />);

      // 左方向へのジェスチャー（以前は逆再生だった）
      const gesture: GestureDataType = {
        startPoint: { x: 500, y: 200 },
        endPoint: { x: 100, y: 200 },
        path: [
          { x: 500, y: 200 },
          { x: 100, y: 200 },
        ],
        distance: 400,
        pathLength: 400,
        cumulativeDistances: [0, 400],
      };

      act(() => {
        if (capturedOnGestureComplete) {
          capturedOnGestureComplete(gesture);
        }
      });

      // 順再生API（playAudioWithDynamicPitch）が呼ばれる
      expect(mockPlayAudioWithDynamicPitch).toHaveBeenCalled();
      // 逆再生APIは呼ばれない（旧APIはもう存在しない）
    });

    it('再生中はキャンバスが無効化される', () => {
      const mockBuffer = { duration: 5, sampleRate: 44100 } as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;
      mockUseAudioProcessor.isPlaying = true;

      render(<MainPage />);

      expect(screen.getByText('再生中...')).toBeInTheDocument();
    });

    it('再生完了時にキャンバスがクリアされる', async () => {
      const mockBuffer = { duration: 5, sampleRate: 44100 } as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;
      mockUseAudioProcessor.isPlaying = true;

      const { rerender } = render(<MainPage />);

      // 再生完了をシミュレート
      mockUseAudioProcessor.isPlaying = false;
      rerender(<MainPage />);

      // キャンバスがクリアされ、再入力可能状態になる
      await waitFor(() => {
        expect(screen.queryByText('再生中...')).not.toBeInTheDocument();
      });
    });

    it('エラー発生時に通知が表示される', () => {
      mockUseAudioProcessor.error = '音声の再生に失敗しました';

      render(<MainPage />);

      // 複数のアラートがあるため getAllByRole を使用
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
      expect(screen.getAllByText('音声の再生に失敗しました').length).toBeGreaterThan(0);
    });
  });
});
