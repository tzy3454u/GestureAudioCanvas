'use client';

import { useState, useCallback, useEffect } from 'react';
import { Container, Box, Alert, Snackbar, Slider, Typography, Stack } from '@mui/material';
import VolumeDown from '@mui/icons-material/VolumeDown';
import VolumeUp from '@mui/icons-material/VolumeUp';
import { AuthGuard } from '@/components/AuthGuard';
import { Header } from '@/components/Header';
import { AudioSelector } from '@/components/AudioSelector';
import { GestureCanvas } from '@/components/GestureCanvas';
import { useAudioProcessor, DynamicPlaybackParams } from '@/hooks/useAudioProcessor';
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
    setVolumeLevel,
    calculateDurationRate,
    generatePitchCurve,
    playAudioWithDynamicPitch,
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

      // 軌跡総線分長から再生時間倍率を計算（pathLengthを使用）
      const durationRate = calculateDurationRate(gesture.pathLength, CANVAS_WIDTH);

      // 軌跡からピッチ曲線を生成
      const pitchCurve = generatePitchCurve(gesture.path, CANVAS_HEIGHT);

      // 再生時間を計算
      const duration = durationRate * audioBuffer.duration;

      // 動的ピッチ再生パラメータ
      const params: DynamicPlaybackParams = {
        durationRate,
        pitchCurve,
        duration,
      };

      // 動的ピッチで音声を再生（X座標方向に関わらず常に順再生）
      playAudioWithDynamicPitch(params);
    },
    [audioBuffer, calculateDurationRate, generatePitchCurve, playAudioWithDynamicPitch]
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
