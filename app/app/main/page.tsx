'use client';

import { useState, useCallback, useEffect } from 'react';
import { Container, Box, Alert, Snackbar, Slider, Typography, Stack, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import VolumeDown from '@mui/icons-material/VolumeDown';
import VolumeUp from '@mui/icons-material/VolumeUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { AuthGuard } from '@/components/AuthGuard';
import { Header } from '@/components/Header';
import { AudioSelector } from '@/components/AudioSelector';
import { GestureCanvas } from '@/components/GestureCanvas';
import { useAudioProcessor, DynamicPlaybackParams } from '@/hooks/useAudioProcessor';
import { GestureData } from '@/hooks/useGestureCanvas';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';

/**
 * メインアプリケーション画面
 * Requirements: 1.1, 1.5, 2.1, 2.3, 7.1, 7.2, 7.3, 8.4
 */
export default function MainPage() {
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  // レスポンシブキャンバスサイズを取得
  const { canvasSize } = useResponsiveCanvas();

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
      const durationRate = calculateDurationRate(gesture.pathLength, canvasSize.width);

      // 軌跡からピッチ曲線を生成
      const pitchCurve = generatePitchCurve(gesture.path, canvasSize.height);

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
    [audioBuffer, canvasSize, calculateDurationRate, generatePitchCurve, playAudioWithDynamicPitch]
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
            py: { xs: 2, sm: 4 },
            gap: { xs: 2, sm: 4 },
          }}
        >
          {/* 使い方 */}
          <Accordion sx={{ width: '100%', maxWidth: canvasSize.width }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="usage-content"
              id="usage-header"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <HelpOutlineIcon color="primary" />
                <Typography>使い方</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    1. 音声を選択
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    「サンプル音源」ボタンでテスト用のサイン波を使用するか、「ファイルを選択」ボタンでお好きな音声ファイルを読み込みます。
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                    対応形式: MP3, WAV, AAC, OGG, WebM, FLAC など
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    2. キャンバスで描画
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    音声が読み込まれると、キャンバスが有効になります。マウスやタッチで線を描いてください。
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    3. 音声が再生される
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    描いた線に沿って音声が再生されます。
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" component="li">
                      線の長さ → 再生時間（長いほど長く再生）
                    </Typography>
                    <Typography variant="body2" color="text.secondary" component="li">
                      縦の位置 → ピッチ（上ほど高く、下ほど低く）
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

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
            width={canvasSize.width}
            height={canvasSize.height}
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
            <Alert severity="error" sx={{ width: '100%', maxWidth: canvasSize.width }}>
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
