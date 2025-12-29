'use client';

import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

/**
 * キャンバスのサイズを表すインターフェース
 */
export interface CanvasDimensions {
  width: number;
  height: number;
}

/**
 * useResponsiveCanvasフックの戻り値
 */
export interface UseResponsiveCanvasReturn {
  /** 現在のキャンバスサイズ */
  canvasSize: CanvasDimensions;
  /** モバイル判定（600px未満） */
  isMobile: boolean;
  /** タブレット判定（600px以上900px未満） */
  isTablet: boolean;
  /** デスクトップ判定（900px以上） */
  isDesktop: boolean;
}

/**
 * ブレイクポイント毎の固定キャンバスサイズ
 * アスペクト比2:1を維持
 */
export const CANVAS_SIZES = {
  mobile: { width: 350, height: 175 },
  tablet: { width: 550, height: 275 },
  desktop: { width: 800, height: 400 },
} as const;

/**
 * ビューポートサイズに基づいてキャンバスサイズを計算するカスタムフック
 *
 * MUIのブレイクポイントを使用して、モバイル・タブレット・デスクトップの
 * 3段階でキャンバスサイズを切り替える。
 *
 * @returns キャンバスサイズとブレイクポイント判定
 */
export function useResponsiveCanvas(): UseResponsiveCanvasReturn {
  const theme = useTheme();

  // ブレイクポイント判定（noSsr: true でSSR時のハイドレーション問題を回避）
  const isSmUp = useMediaQuery(theme.breakpoints.up('sm'), { noSsr: true });
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });

  // ブレイクポイントに基づくデバイス判定
  const isDesktop = isMdUp;
  const isTablet = isSmUp && !isMdUp;
  const isMobile = !isSmUp;

  // デバイスタイプに応じたキャンバスサイズを返却
  const canvasSize: CanvasDimensions = isDesktop
    ? CANVAS_SIZES.desktop
    : isTablet
    ? CANVAS_SIZES.tablet
    : CANVAS_SIZES.mobile;

  return {
    canvasSize,
    isMobile,
    isTablet,
    isDesktop,
  };
}
