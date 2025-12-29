'use client';

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AudioSelector } from '@/components/AudioSelector';

// モック用のAudioBuffer
const mockAudioBuffer = {
  duration: 5,
  length: 220500,
  numberOfChannels: 1,
  sampleRate: 44100,
  getChannelData: () => new Float32Array(220500),
} as unknown as AudioBuffer;

// useAudioProcessorのモック状態
let mockState = {
  audioBuffer: null as AudioBuffer | null,
  reversedBuffer: null as AudioBuffer | null,
  isLoading: false,
  isPlaying: false,
  error: null as string | null,
};

const mockLoadSampleAudio = jest.fn();
const mockLoadAudioFile = jest.fn();

jest.mock('@/hooks/useAudioProcessor', () => ({
  useAudioProcessor: () => ({
    ...mockState,
    initializeAudioContext: jest.fn(),
    loadAudioFile: mockLoadAudioFile,
    loadSampleAudio: mockLoadSampleAudio,
    playAudio: jest.fn(),
    stopAudio: jest.fn(),
    calculateDurationRate: jest.fn(),
    calculatePitchRate: jest.fn(),
    isReversePlayback: jest.fn(),
  }),
}));

describe('AudioSelector', () => {
  const mockOnAudioLoaded = jest.fn();
  const mockOnError = jest.fn();
  const mockOnLoadingChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // モック状態をリセット
    mockState = {
      audioBuffer: null,
      reversedBuffer: null,
      isLoading: false,
      isPlaying: false,
      error: null,
    };
  });

  describe('UI表示 (Requirement 1.1)', () => {
    it('サンプル音源ボタンが表示されること', () => {
      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      expect(screen.getByRole('button', { name: /サンプル音源/i })).toBeInTheDocument();
    });

    it('ファイル選択ボタンが表示されること', () => {
      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      expect(screen.getByRole('button', { name: /ファイルを選択/i })).toBeInTheDocument();
    });

    it('hidden file inputが存在すること', () => {
      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveStyle({ display: 'none' });
    });

    it('音声ファイル形式のみ受け付けること', () => {
      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'audio/*');
    });
  });

  describe('サンプル音源選択', () => {
    it('サンプル音源ボタンクリックでloadSampleAudioが呼ばれること', async () => {
      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      const sampleButton = screen.getByRole('button', { name: /サンプル音源/i });
      await act(async () => {
        fireEvent.click(sampleButton);
      });

      expect(mockLoadSampleAudio).toHaveBeenCalled();
    });

    it('サンプル音源選択時に選択状態の視覚的フィードバックがあること', async () => {
      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      const sampleButton = screen.getByRole('button', { name: /サンプル音源/i });
      await act(async () => {
        fireEvent.click(sampleButton);
      });

      // MUIのcontainedバリアントまたは選択状態を確認
      expect(sampleButton).toHaveClass('MuiButton-contained');
    });
  });

  describe('ファイル選択', () => {
    it('ファイル選択ボタンクリックでfile inputがトリガーされること', () => {
      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      const fileButton = screen.getByRole('button', { name: /ファイルを選択/i });
      fireEvent.click(fileButton);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('ロード状態表示 (Requirement 1.4)', () => {
    it('ロード中にスピナーが表示されること', () => {
      // ロード中状態をシミュレート
      mockState.isLoading = true;

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
          onLoadingChange={mockOnLoadingChange}
        />
      );

      // ロード中はスピナーが表示される
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('ロード中にボタンが無効化されること', () => {
      // ロード中状態をシミュレート
      mockState.isLoading = true;

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      const sampleButton = screen.getByRole('button', { name: /サンプル音源/i });
      expect(sampleButton).toBeDisabled();
    });

    it('ロード完了後にロード完了表示がされること', () => {
      // ロード完了状態をシミュレート
      mockState.audioBuffer = mockAudioBuffer;

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      // ロード完了後、選択状態が表示される
      expect(screen.getByText(/読み込み完了/i)).toBeInTheDocument();
    });
  });

  describe('エラー表示 (Requirement 1.6)', () => {
    it('エラー時にエラーメッセージが表示されること', () => {
      const errorMessage = '対応していないファイル形式です';

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
          externalError={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('内部エラー時にエラーメッセージが表示されること', () => {
      const errorMessage = '音声ファイルの読み込みに失敗しました';
      mockState.error = errorMessage;

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('外部エラー時にonErrorコールバックが呼ばれること', () => {
      const errorMessage = '音声ファイルの読み込みに失敗しました';

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
          externalError={errorMessage}
        />
      );

      expect(mockOnError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('キャンバス有効化連携 (Requirement 1.5)', () => {
    it('音声ロード完了時にonAudioLoadedがAudioBufferで呼ばれること', () => {
      // ロード完了状態をシミュレート
      mockState.audioBuffer = mockAudioBuffer;

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
        />
      );

      expect(mockOnAudioLoaded).toHaveBeenCalledWith(mockAudioBuffer);
    });
  });

  describe('ロード状態変更の通知', () => {
    it('ロード状態が変更されるとonLoadingChangeが呼ばれること', () => {
      mockState.isLoading = true;

      render(
        <AudioSelector
          onAudioLoaded={mockOnAudioLoaded}
          onError={mockOnError}
          onLoadingChange={mockOnLoadingChange}
        />
      );

      expect(mockOnLoadingChange).toHaveBeenCalledWith(true);
    });
  });
});
