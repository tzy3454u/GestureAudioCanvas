'use client';

import { useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useGestureCanvas, GestureData, Point } from '@/hooks/useGestureCanvas';

export interface GestureCanvasProps {
  isEnabled: boolean;
  isPlaying: boolean;
  onGestureComplete: (gesture: GestureData) => void;
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;

/**
 * ドラッグ操作の受付と軌跡描画を行うキャンバスコンポーネント
 */
export function GestureCanvas({
  isEnabled,
  isPlaying,
  onGestureComplete,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: GestureCanvasProps) {
  const {
    canvasRef,
    isDrawing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearCanvas,
  } = useGestureCanvas();

  // 再生完了時にキャンバスをクリア
  useEffect(() => {
    if (!isPlaying) {
      clearCanvas();
    }
  }, [isPlaying, clearCanvas]);

  const handleDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isEnabled || isPlaying) return;
      handlePointerDown(e);
    },
    [isEnabled, isPlaying, handlePointerDown]
  );

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isEnabled || isPlaying) return;
      handlePointerMove(e);
    },
    [isEnabled, isPlaying, handlePointerMove]
  );

  const handleUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isEnabled || isPlaying) return;
      const gestureData = handlePointerUp(e);
      if (gestureData) {
        onGestureComplete(gestureData);
      }
    },
    [isEnabled, isPlaying, handlePointerUp, onGestureComplete]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDrawing) {
        handleUp(e);
      }
    },
    [isDrawing, handleUp]
  );

  const showOverlay = !isEnabled || isPlaying;
  const overlayMessage = !isEnabled ? '音声をロードしてください' : '再生中...';

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        border: '2px solid',
        borderColor: isEnabled ? 'primary.main' : 'grey.400',
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: 'grey.100',
        cursor: isEnabled && !isPlaying ? 'crosshair' : 'not-allowed',
        touchAction: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handlePointerLeave}
        style={{
          display: 'block',
        }}
      />
      {showOverlay && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {overlayMessage}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
