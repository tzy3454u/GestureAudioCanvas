'use client';

import { useState, useCallback, useEffect } from 'react';
import { Container, Box, Alert, Snackbar, Slider, Typography, Stack } from '@mui/material';
import VolumeDown from '@mui/icons-material/VolumeDown';
import VolumeUp from '@mui/icons-material/VolumeUp';
import { AuthGuard } from '@/components/AuthGuard';
import { Header } from '@/components/Header';
import { AudioSelector } from '@/components/AudioSelector';
import { GestureCanvas } from '@/components/GestureCanvas';
import { useAudioProcessor, PlaybackParams } from '@/hooks/useAudioProcessor';
import { GestureData } from '@/hooks/useGestureCanvas';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

/**
 * メインアプリケーション画面
 * Requirements: 1.1, 1.5, 2.1, 2.3, 7.1, 7.2, 7.3, 8.4
 */
export default function MainPage() {
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const {
    audioBuffer,
    isPlaying,
    error: audioError,
    volume,
    setAudioBufferExternal,
    playAudio,
    setVolumeLevel,
    calculateDurationRate,
    calculatePitchRate,
    isReversePlayback,
  } = useAudioProcessor();

  // AudioProcessorのエラーを監視
  useEffect(() => {
    if (audioError) {
      setErrorMessage(audioError);
      setShowError(true);
    }
  }, [audioError]);

  // 音声ロード完了時のハンドラ
  const handleAudioLoaded = useCallback(async (buffer: AudioBuffer) => {
    try {
      await setAudioBufferExternal(buffer);
      setIsAudioLoaded(true);
      setErrorMessage(null);
    } catch {
      // エラーはuseAudioProcessor内で処理される
    }
  }, [setAudioBufferExternal]);

  // エラー発生時のハンドラ
  const handleError = useCallback((error: string) => {
    setErrorMessage(error);
    setShowError(true);
  }, []);

  // ローディング状態変更時のハンドラ
  const handleLoadingChange = useCallback((isLoading: boolean) => {
    if (isLoading) {
      setIsAudioLoaded(false);
    }
  }, []);

  // ジェスチャー完了時のハンドラ
  const handleGestureComplete = useCallback(
    (gesture: GestureData) => {
      if (!audioBuffer) return;

      // ジェスチャーからパラメータを計算
      const xDelta = gesture.endPoint.x - gesture.startPoint.x;
      const isReverse = isReversePlayback(xDelta);

      // Y座標を正規化（-1: 上端, 1: 下端）
      const centerY = CANVAS_HEIGHT / 2;
      const normalizedY = (gesture.startPoint.y - centerY) / centerY;

      // 再生パラメータを計算
      const durationRate = calculateDurationRate(gesture.distance, CANVAS_WIDTH);
      const pitchRate = calculatePitchRate(normalizedY);

      const params: PlaybackParams = {
        isReverse,
        durationRate,
        pitchRate,
      };

      // 音声を再生
      playAudio(params);
    },
    [audioBuffer, calculateDurationRate, calculatePitchRate, isReversePlayback, playAudio]
  );

  // エラーダイアログを閉じる
  const handleCloseError = useCallback(() => {
    setShowError(false);
  }, []);

  // 音量変更ハンドラ
  const handleVolumeChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      setVolumeLevel(newValue as number);
    },
    [setVolumeLevel]
  );

  return (
    <AuthGuard>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <Container
          maxWidth="lg"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
            gap: 4,
          }}
        >
          {/* 音声選択UI */}
          <AudioSelector
            onAudioLoaded={handleAudioLoaded}
            onError={handleError}
            onLoadingChange={handleLoadingChange}
            externalError={null}
          />

          {/* ジェスチャーキャンバス */}
          <GestureCanvas
            isEnabled={isAudioLoaded}
            isPlaying={isPlaying}
            onGestureComplete={handleGestureComplete}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
          />

          {/* 音量スライダー */}
          <Box sx={{ width: '100%', maxWidth: 300 }}>
            <Typography gutterBottom>音量</Typography>
            <Stack spacing={2} direction="row" alignItems="center">
              <VolumeDown />
              <Slider
                value={volume}
                onChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.01}
                aria-label="音量"
              />
              <VolumeUp />
            </Stack>
          </Box>

          {/* エラー表示（常に表示） */}
          {errorMessage && (
            <Alert severity="error" sx={{ width: '100%', maxWidth: CANVAS_WIDTH }}>
              {errorMessage}
            </Alert>
          )}
        </Container>

        {/* エラーSnackbar */}
        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Box>
    </AuthGuard>
  );
}
