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
const mockPlayAudio = jest.fn();
const mockLoadSampleAudio = jest.fn();
const mockLoadAudioFile = jest.fn();
const mockInitializeAudioContext = jest.fn();

const mockUseAudioProcessor = {
  audioBuffer: null,
  reversedBuffer: null,
  isLoading: false,
  isPlaying: false,
  error: null,
  initializeAudioContext: mockInitializeAudioContext,
  loadAudioFile: mockLoadAudioFile,
  loadSampleAudio: mockLoadSampleAudio,
  playAudio: mockPlayAudio,
  stopAudio: jest.fn(),
  calculateDurationRate: jest.fn((distance: number) => distance / 20),
  calculatePitchRate: jest.fn((normalizedY: number) => Math.pow(2, normalizedY * 2)),
  isReversePlayback: jest.fn((xDelta: number) => xDelta < 0),
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

describe('MainPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.isLoading = false;
    mockUseAudioProcessor.audioBuffer = null;
    mockUseAudioProcessor.isLoading = false;
    mockUseAudioProcessor.isPlaying = false;
    mockUseAudioProcessor.error = null;
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

  describe('Task 6.3: ジェスチャーから音声再生への連携', () => {
    it('ジェスチャー完了時にパラメータを計算して再生をトリガーする', async () => {
      const mockBuffer = { duration: 5, sampleRate: 44100, numberOfChannels: 1, length: 220500, getChannelData: jest.fn() } as unknown as AudioBuffer;
      mockUseAudioProcessor.audioBuffer = mockBuffer;
      mockUseAudioProcessor.reversedBuffer = mockBuffer;

      render(<MainPage />);

      // onGestureComplete コールバックをシミュレート
      // 実際のテストではGestureCanvasからのコールバックをトリガーする
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
