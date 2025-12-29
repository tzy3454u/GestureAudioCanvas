'use client';

import { renderHook } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';

// Mock useMediaQuery
const mockUseMediaQuery = jest.fn();
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: (query: string | ((theme: unknown) => string)) => mockUseMediaQuery(query),
}));

// Import after mocking
import { useResponsiveCanvas, CANVAS_SIZES } from '@/hooks/useResponsiveCanvas';

const theme = createTheme();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('useResponsiveCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('デスクトップ（900px以上）', () => {
    beforeEach(() => {
      // isSmUp = true, isMdUp = true → デスクトップ
      mockUseMediaQuery.mockImplementation((query: unknown) => {
        if (typeof query === 'function') {
          const queryString = query(theme);
          if (queryString.includes('900')) return true; // md breakpoint
          if (queryString.includes('600')) return true; // sm breakpoint
        }
        return true;
      });
    });

    it('デスクトップサイズ（800x400）を返すこと', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      expect(result.current.canvasSize).toEqual(CANVAS_SIZES.desktop);
      expect(result.current.canvasSize.width).toBe(800);
      expect(result.current.canvasSize.height).toBe(400);
    });

    it('isDesktopがtrueを返すこと', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isMobile).toBe(false);
    });

    it('アスペクト比2:1が維持されること', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      const { width, height } = result.current.canvasSize;
      expect(width / height).toBe(2);
    });
  });

  describe('タブレット（600px以上900px未満）', () => {
    let callCount = 0;
    beforeEach(() => {
      callCount = 0;
      // useResponsiveCanvas内で2回呼ばれる: 1回目=isSmUp(sm), 2回目=isMdUp(md)
      // タブレット: isSmUp = true, isMdUp = false
      mockUseMediaQuery.mockImplementation(() => {
        callCount++;
        // 1回目の呼び出し (sm) = true, 2回目の呼び出し (md) = false
        return callCount === 1;
      });
    });

    it('タブレットサイズ（550x275）を返すこと', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      expect(result.current.canvasSize).toEqual(CANVAS_SIZES.tablet);
      expect(result.current.canvasSize.width).toBe(550);
      expect(result.current.canvasSize.height).toBe(275);
    });

    it('isTabletがtrueを返すこと', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isMobile).toBe(false);
    });

    it('アスペクト比2:1が維持されること', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      const { width, height } = result.current.canvasSize;
      expect(width / height).toBe(2);
    });
  });

  describe('モバイル（600px未満）', () => {
    beforeEach(() => {
      // isSmUp = false, isMdUp = false → モバイル
      mockUseMediaQuery.mockImplementation(() => false);
    });

    it('モバイルサイズ（350x175）を返すこと', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      expect(result.current.canvasSize).toEqual(CANVAS_SIZES.mobile);
      expect(result.current.canvasSize.width).toBe(350);
      expect(result.current.canvasSize.height).toBe(175);
    });

    it('isMobileがtrueを返すこと', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('アスペクト比2:1が維持されること', () => {
      const { result } = renderHook(() => useResponsiveCanvas(), { wrapper });

      const { width, height } = result.current.canvasSize;
      expect(width / height).toBe(2);
    });
  });

  describe('CANVAS_SIZES定数', () => {
    it('全てのサイズでアスペクト比2:1が維持されていること', () => {
      expect(CANVAS_SIZES.mobile.width / CANVAS_SIZES.mobile.height).toBe(2);
      expect(CANVAS_SIZES.tablet.width / CANVAS_SIZES.tablet.height).toBe(2);
      expect(CANVAS_SIZES.desktop.width / CANVAS_SIZES.desktop.height).toBe(2);
    });

    it('サイズが正しく定義されていること', () => {
      expect(CANVAS_SIZES.mobile).toEqual({ width: 350, height: 175 });
      expect(CANVAS_SIZES.tablet).toEqual({ width: 550, height: 275 });
      expect(CANVAS_SIZES.desktop).toEqual({ width: 800, height: 400 });
    });
  });
});
