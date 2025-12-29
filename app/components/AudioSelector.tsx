'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAudioProcessor } from '@/hooks/useAudioProcessor';

export interface AudioSelectorProps {
  onAudioLoaded: (buffer: AudioBuffer) => void;
  onError: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  externalError?: string | null;
}

type SourceType = 'sample' | 'file' | null;

/**
 * 音声ファイルの選択とロード状態の表示を行うコンポーネント
 * Requirements: 1.1, 1.4, 1.5, 1.6
 */
export function AudioSelector({
  onAudioLoaded,
  onError,
  onLoadingChange,
  externalError,
}: AudioSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSource, setSelectedSource] = useState<SourceType>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const {
    audioBuffer,
    isLoading,
    error: internalError,
    loadSampleAudio,
    loadAudioFile,
  } = useAudioProcessor();

  // ロード状態の変更を親に通知
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // エラー発生時に親に通知
  useEffect(() => {
    if (internalError) {
      onError(internalError);
    }
  }, [internalError, onError]);

  // 外部エラーが渡された場合も通知
  useEffect(() => {
    if (externalError) {
      onError(externalError);
    }
  }, [externalError, onError]);

  // AudioBufferがロードされたら親に通知
  useEffect(() => {
    if (audioBuffer) {
      onAudioLoaded(audioBuffer);
      setIsLoaded(true);
    }
  }, [audioBuffer, onAudioLoaded]);

  const handleSampleClick = useCallback(async () => {
    setSelectedSource('sample');
    setIsLoaded(false);
    try {
      await loadSampleAudio();
    } catch {
      // エラーはuseAudioProcessor内で処理される
    }
  }, [loadSampleAudio]);

  const handleFileButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setSelectedSource('file');
      setIsLoaded(false);
      try {
        await loadAudioFile(file);
      } catch {
        // エラーはuseAudioProcessor内で処理される
      }

      // ファイル入力をリセット（同じファイルを再選択可能にする）
      event.target.value = '';
    },
    [loadAudioFile]
  );

  const displayError = externalError || internalError;

  return (
    <Box sx={{ width: '100%', maxWidth: 400 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1" gutterBottom>
          音声ソースを選択
        </Typography>

        <Stack direction="row" spacing={2}>
          {/* サンプル音源ボタン */}
          <Button
            variant={selectedSource === 'sample' ? 'contained' : 'outlined'}
            startIcon={
              isLoading && selectedSource === 'sample' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <MusicNoteIcon />
              )
            }
            onClick={handleSampleClick}
            disabled={isLoading}
            fullWidth
          >
            サンプル音源
          </Button>

          {/* ファイル選択ボタン */}
          <Button
            variant={selectedSource === 'file' ? 'contained' : 'outlined'}
            startIcon={
              isLoading && selectedSource === 'file' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <UploadFileIcon />
              )
            }
            onClick={handleFileButtonClick}
            disabled={isLoading}
            fullWidth
          >
            ファイルを選択
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </Stack>

        {/* ロード状態表示 */}
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} role="progressbar" />
            <Typography variant="body2" color="text.secondary">
              読み込み中...
            </Typography>
          </Box>
        )}

        {/* ロード完了表示 */}
        {isLoaded && !isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="body2" color="success.main">
              読み込み完了
            </Typography>
          </Box>
        )}

        {/* エラー表示 */}
        {displayError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {displayError}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
