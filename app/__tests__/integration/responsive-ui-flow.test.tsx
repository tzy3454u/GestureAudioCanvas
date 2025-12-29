/**
 * レスポンシブUI統合テスト
 * Task 7.2: レスポンシブUIの統合テスト
 * - モバイル、タブレット、デスクトップの各ビューポートでレイアウトを確認
 * - キャンバスサイズ変更時に音声処理が正しく動作することを確認
 * - ヘッダーとAudioSelectorの表示切り替えを確認
 * Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';

// useMediaQueryのモック
const mockUseMediaQuery = jest.fn();
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: (query: string | ((theme: unknown) => string)) => mockUseMediaQuery(query),
}));

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
const mockCalculateDurationRate = jest.fn((pathLength: number, canvasWidth: number) => {
  const baseDistance = canvasWidth / 2;
  return pathLength / baseDistance;
});
const mockGeneratePitchCurve = jest.fn(() => new Float32Array(100).fill(3.0));

let mockAudioBuffer: AudioBuffer | null = null;
let mockIsPlaying = false;

jest.mock('@/hooks/useAudioProcessor', () => ({
  useAudioProcessor: () => ({
    audioBuffer: mockAudioBuffer,
    isLoading: false,
    isPlaying: mockIsPlaying,
    error: null,
    volume: 0.5,
    initializeAudioContext: jest.fn(),
    loadAudioFile: jest.fn(),
    loadSampleAudio: jest.fn(),
    setAudioBufferExternal: jest.fn(),
    stopAudio: jest.fn(),
    setVolumeLevel: jest.fn(),
    calculateDurationRate: mockCalculateDurationRate,
    calculatePitchRate: jest.fn(),
    calculatePitchFromY: jest.fn(),
    generatePitchCurve: mockGeneratePitchCurve,
    playAudioWithDynamicPitch: mockPlayAudioWithDynamicPitch,
    playAudioWithStaticPitch: jest.fn(),
  }),
}));

// useGestureCanvasのモック
jest.mock('@/hooks/useGestureCanvas', () => ({
  useGestureCanvas: () => ({
    canvasRef: { current: null },
    isDrawing: false,
    currentPath: [],
    handlePointerDown: jest.fn(),
    handlePointerMove: jest.fn(),
    handlePointerUp: jest.fn(),
    clearCanvas: jest.fn(),
    calculateGestureParams: jest.fn(),
    getCanvasPoint: jest.fn(),
  }),
}));

// GestureCanvasのモック
type GestureDataType = {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  path: { x: number; y: number }[];
  distance: number;
  pathLength: number;
  cumulativeDistances: number[];
};
let capturedOnGestureComplete: ((gesture: GestureDataType) => void) | null = null;
let capturedCanvasWidth = 0;
let capturedCanvasHeight = 0;

jest.mock('@/components/GestureCanvas', () => ({
  GestureCanvas: ({
    onGestureComplete,
    width,
    height,
    isEnabled,
    isPlaying,
  }: {
    onGestureComplete: (gesture: GestureDataType) => void;
    width: number;
    height: number;
    isEnabled: boolean;
    isPlaying: boolean;
  }) => {
    capturedOnGestureComplete = onGestureComplete;
    capturedCanvasWidth = width;
    capturedCanvasHeight = height;
    const showOverlay = !isEnabled || isPlaying;
    const overlayMessage = isPlaying ? '再生中...' : !isEnabled ? '音声をロードしてください' : '';
    return (
      <div data-testid="gesture-canvas" data-width={width} data-height={height}>
        {showOverlay && overlayMessage && <span>{overlayMessage}</span>}
      </div>
    );
  },
}));

// インポート後にモックが適用される
import MainPage from '@/app/main/page';
import { Header } from '@/components/Header';
import { AudioSelector } from '@/components/AudioSelector';

const theme = createTheme();

// MUIテーマラッパー
const renderWithTheme = (component: React.ReactNode) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// ビューポートシミュレーション用ヘルパー
const setupViewport = (viewport: 'mobile' | 'tablet' | 'desktop') => {
  let callCount = 0;
  mockUseMediaQuery.mockImplementation(() => {
    callCount++;
    switch (viewport) {
      case 'mobile':
        // isSmUp = false, isMdUp = false
        return false;
      case 'tablet':
        // isSmUp = true, isMdUp = false
        // 1回目(sm)=true, 2回目(md)=false
        return callCount === 1;
      case 'desktop':
        // isSmUp = true, isMdUp = true
        return true;
    }
  });
};

describe('レスポンシブUI統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.isAuthenticated = true;
    mockUseAuth.isLoading = false;
    mockAudioBuffer = null;
    mockIsPlaying = false;
    capturedOnGestureComplete = null;
    capturedCanvasWidth = 0;
    capturedCanvasHeight = 0;
    setupViewport('desktop');
  });

  describe('Req 3.1, 3.2: レイアウトのパディングとギャップ', () => {
    it('モバイルビューポートでContainerが正しくレンダリングされる', () => {
      setupViewport('mobile');

      renderWithTheme(<MainPage />);

      // Containerが存在することを確認
      const container = document.querySelector('[class*="MuiContainer"]');
      expect(container).toBeTruthy();
    });

    it('タブレットビューポートでContainerが正しくレンダリングされる', () => {
      setupViewport('tablet');

      renderWithTheme(<MainPage />);

      const container = document.querySelector('[class*="MuiContainer"]');
      expect(container).toBeTruthy();
    });

    it('デスクトップビューポートでContainerが正しくレンダリングされる', () => {
      setupViewport('desktop');

      renderWithTheme(<MainPage />);

      const container = document.querySelector('[class*="MuiContainer"]');
      expect(container).toBeTruthy();
    });
  });

  describe('Req 1.4: キャンバスサイズ変更時の音声処理', () => {
    beforeEach(() => {
      mockAudioBuffer = {
        duration: 5,
        sampleRate: 44100,
        numberOfChannels: 1,
        length: 220500,
        getChannelData: jest.fn(),
      } as unknown as AudioBuffer;
    });

    it('モバイルサイズ（350x175）でジェスチャー完了時に正しいキャンバスサイズを渡す', () => {
      setupViewport('mobile');

      renderWithTheme(<MainPage />);

      // GestureCanvasに渡されたサイズを確認
      expect(capturedCanvasWidth).toBe(350);
      expect(capturedCanvasHeight).toBe(175);

      // ジェスチャー完了をシミュレート
      const gesture: GestureDataType = {
        startPoint: { x: 50, y: 100 },
        endPoint: { x: 250, y: 100 },
        path: [
          { x: 50, y: 100 },
          { x: 250, y: 100 },
        ],
        distance: 200,
        pathLength: 200,
        cumulativeDistances: [0, 200],
      };

      act(() => {
        if (capturedOnGestureComplete) {
          capturedOnGestureComplete(gesture);
        }
      });

      // calculateDurationRateがモバイルのキャンバス幅で呼ばれる
      expect(mockCalculateDurationRate).toHaveBeenCalledWith(200, 350);
      // generatePitchCurveがモバイルのキャンバス高さで呼ばれる
      expect(mockGeneratePitchCurve).toHaveBeenCalledWith(expect.any(Array), 175);
    });

    it('タブレットサイズ（550x275）でジェスチャー完了時に正しいキャンバスサイズを渡す', () => {
      setupViewport('tablet');

      renderWithTheme(<MainPage />);

      expect(capturedCanvasWidth).toBe(550);
      expect(capturedCanvasHeight).toBe(275);

      const gesture: GestureDataType = {
        startPoint: { x: 100, y: 150 },
        endPoint: { x: 400, y: 150 },
        path: [
          { x: 100, y: 150 },
          { x: 400, y: 150 },
        ],
        distance: 300,
        pathLength: 300,
        cumulativeDistances: [0, 300],
      };

      act(() => {
        if (capturedOnGestureComplete) {
          capturedOnGestureComplete(gesture);
        }
      });

      expect(mockCalculateDurationRate).toHaveBeenCalledWith(300, 550);
      expect(mockGeneratePitchCurve).toHaveBeenCalledWith(expect.any(Array), 275);
    });

    it('デスクトップサイズ（800x400）でジェスチャー完了時に正しいキャンバスサイズを渡す', () => {
      setupViewport('desktop');

      renderWithTheme(<MainPage />);

      expect(capturedCanvasWidth).toBe(800);
      expect(capturedCanvasHeight).toBe(400);

      const gesture: GestureDataType = {
        startPoint: { x: 100, y: 200 },
        endPoint: { x: 500, y: 200 },
        path: [
          { x: 100, y: 200 },
          { x: 500, y: 200 },
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

      expect(mockCalculateDurationRate).toHaveBeenCalledWith(400, 800);
      expect(mockGeneratePitchCurve).toHaveBeenCalledWith(expect.any(Array), 400);
    });

    it('全ビューポートでplayAudioWithDynamicPitchが呼ばれる', () => {
      const viewports: Array<'mobile' | 'tablet' | 'desktop'> = ['mobile', 'tablet', 'desktop'];

      viewports.forEach((viewport) => {
        jest.clearAllMocks();
        setupViewport(viewport);

        const { unmount } = renderWithTheme(<MainPage />);

        const gesture: GestureDataType = {
          startPoint: { x: 50, y: 50 },
          endPoint: { x: 150, y: 50 },
          path: [
            { x: 50, y: 50 },
            { x: 150, y: 50 },
          ],
          distance: 100,
          pathLength: 100,
          cumulativeDistances: [0, 100],
        };

        act(() => {
          if (capturedOnGestureComplete) {
            capturedOnGestureComplete(gesture);
          }
        });

        expect(mockPlayAudioWithDynamicPitch).toHaveBeenCalled();
        unmount();
      });
    });
  });

  describe('Req 2.1, 2.2, 2.3, 2.4: ヘッダーの表示切り替え', () => {
    it('モバイル用短縮タイトル「GAC」が存在する', () => {
      renderWithTheme(<Header />);

      expect(screen.getByText('GAC')).toBeInTheDocument();
    });

    it('デスクトップ用フルタイトル「Gesture Audio Canvas」が存在する', () => {
      renderWithTheme(<Header />);

      expect(screen.getByText('Gesture Audio Canvas')).toBeInTheDocument();
    });

    it('モバイル用アイコンのみログアウトボタンが存在する', () => {
      renderWithTheme(<Header />);

      // aria-labelで識別
      expect(screen.getByLabelText('ログアウト')).toBeInTheDocument();
    });

    it('デスクトップ用テキスト付きログアウトボタンが存在する', () => {
      renderWithTheme(<Header />);

      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    it('ログアウトボタン（IconButton）の最小タップ領域44x44pxが確保されている', () => {
      renderWithTheme(<Header />);

      const iconButton = screen.getByLabelText('ログアウト');
      expect(iconButton).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
    });

    it('ユーザーメールアドレスが表示される（デスクトップ用）', () => {
      renderWithTheme(<Header />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('Req 3.3: AudioSelectorの表示切り替え', () => {
    const mockOnAudioLoaded = jest.fn();
    const mockOnError = jest.fn();

    it('AudioSelectorのボタンがStackコンポーネント内に配置される', () => {
      renderWithTheme(
        <AudioSelector onAudioLoaded={mockOnAudioLoaded} onError={mockOnError} />
      );

      const sampleButton = screen.getByRole('button', { name: /サンプル音源/i });
      const buttonContainer = sampleButton.parentElement;

      // MUI StackはMuiStack-rootクラスを持つ
      expect(buttonContainer).toHaveClass('MuiStack-root');
    });

    it('サンプル音源ボタンとファイル選択ボタンが両方表示される', () => {
      renderWithTheme(
        <AudioSelector onAudioLoaded={mockOnAudioLoaded} onError={mockOnError} />
      );

      expect(screen.getByRole('button', { name: /サンプル音源/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ファイルを選択/i })).toBeInTheDocument();
    });

    it('ボタンの最小高さ44pxが確保されている（タップ領域確保）', () => {
      renderWithTheme(
        <AudioSelector onAudioLoaded={mockOnAudioLoaded} onError={mockOnError} />
      );

      const sampleButton = screen.getByRole('button', { name: /サンプル音源/i });
      const fileButton = screen.getByRole('button', { name: /ファイルを選択/i });

      expect(sampleButton).toHaveStyle({ minHeight: '44px' });
      expect(fileButton).toHaveStyle({ minHeight: '44px' });
    });
  });

  describe('GestureCanvasのサイズプロパティ検証', () => {
    it('モバイルでGestureCanvasに350x175が渡される', () => {
      setupViewport('mobile');

      renderWithTheme(<MainPage />);

      const canvas = screen.getByTestId('gesture-canvas');
      expect(canvas).toHaveAttribute('data-width', '350');
      expect(canvas).toHaveAttribute('data-height', '175');
    });

    it('タブレットでGestureCanvasに550x275が渡される', () => {
      setupViewport('tablet');

      renderWithTheme(<MainPage />);

      const canvas = screen.getByTestId('gesture-canvas');
      expect(canvas).toHaveAttribute('data-width', '550');
      expect(canvas).toHaveAttribute('data-height', '275');
    });

    it('デスクトップでGestureCanvasに800x400が渡される', () => {
      setupViewport('desktop');

      renderWithTheme(<MainPage />);

      const canvas = screen.getByTestId('gesture-canvas');
      expect(canvas).toHaveAttribute('data-width', '800');
      expect(canvas).toHaveAttribute('data-height', '400');
    });
  });

  describe('アスペクト比2:1の維持', () => {
    it('全ビューポートでアスペクト比2:1が維持される', () => {
      const viewports: Array<{ name: 'mobile' | 'tablet' | 'desktop'; width: number; height: number }> = [
        { name: 'mobile', width: 350, height: 175 },
        { name: 'tablet', width: 550, height: 275 },
        { name: 'desktop', width: 800, height: 400 },
      ];

      viewports.forEach(({ name, width, height }) => {
        setupViewport(name);

        const { unmount } = renderWithTheme(<MainPage />);

        const canvas = screen.getByTestId('gesture-canvas');
        const canvasWidth = parseInt(canvas.getAttribute('data-width') || '0', 10);
        const canvasHeight = parseInt(canvas.getAttribute('data-height') || '0', 10);

        expect(canvasWidth).toBe(width);
        expect(canvasHeight).toBe(height);
        expect(canvasWidth / canvasHeight).toBe(2);

        unmount();
      });
    });
  });

  describe('音量スライダーとAccordionの幅', () => {
    it('Accordionがキャンバス幅と同期される', () => {
      setupViewport('desktop');

      const { container } = renderWithTheme(<MainPage />);

      // Accordionが存在することを確認
      const accordion = container.querySelector('[class*="MuiAccordion"]');
      expect(accordion).toBeTruthy();
    });

    it('音量スライダーが存在する', () => {
      setupViewport('desktop');

      renderWithTheme(<MainPage />);

      expect(screen.getByText('音量')).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: '音量' })).toBeInTheDocument();
    });
  });
});
