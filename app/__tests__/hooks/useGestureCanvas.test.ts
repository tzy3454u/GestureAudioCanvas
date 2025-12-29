'use client';

import { renderHook, act } from '@testing-library/react';
import { useGestureCanvas, Point, GestureParams } from '@/hooks/useGestureCanvas';

// Mock canvas context
const mockClearRect = jest.fn();
const mockBeginPath = jest.fn();
const mockMoveTo = jest.fn();
const mockLineTo = jest.fn();
const mockStroke = jest.fn();
const mockArc = jest.fn();
const mockFill = jest.fn();

const mockContext = {
  clearRect: mockClearRect,
  beginPath: mockBeginPath,
  moveTo: mockMoveTo,
  lineTo: mockLineTo,
  stroke: mockStroke,
  arc: mockArc,
  fill: mockFill,
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  lineCap: 'round',
  lineJoin: 'round',
} as unknown as CanvasRenderingContext2D;

describe('useGestureCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初期状態', () => {
    it('canvasRefが作成されること', () => {
      const { result } = renderHook(() => useGestureCanvas());
      expect(result.current.canvasRef).toBeDefined();
      expect(result.current.canvasRef.current).toBeNull();
    });

    it('isDrawingがfalseで初期化されること', () => {
      const { result } = renderHook(() => useGestureCanvas());
      expect(result.current.isDrawing).toBe(false);
    });

    it('currentPathが空配列で初期化されること', () => {
      const { result } = renderHook(() => useGestureCanvas());
      expect(result.current.currentPath).toEqual([]);
    });
  });

  describe('calculateGestureParams', () => {
    const canvasHeight = 400;

    it('2点間の直線距離を正確に計算すること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 30, y: 40 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      // ピタゴラスの定理: sqrt(30^2 + 40^2) = 50
      expect(params.distance).toBe(50);
    });

    it('右方向のジェスチャーでisRightwardがtrueになること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 200 };
      const end: Point = { x: 200, y: 200 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      expect(params.isRightward).toBe(true);
    });

    it('左方向のジェスチャーでisRightwardがfalseになること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 200, y: 200 };
      const end: Point = { x: 100, y: 200 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      expect(params.isRightward).toBe(false);
    });

    it('キャンバス上端でnormalizedYが-1になること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 0 }; // 上端
      const end: Point = { x: 200, y: 0 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      expect(params.normalizedY).toBe(-1);
    });

    it('キャンバス中央でnormalizedYが0になること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 200 }; // 中央 (400/2)
      const end: Point = { x: 200, y: 200 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      expect(params.normalizedY).toBe(0);
    });

    it('キャンバス下端でnormalizedYが1になること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 400 }; // 下端
      const end: Point = { x: 200, y: 400 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      expect(params.normalizedY).toBe(1);
    });

    it('上半分でnormalizedYが負の値になること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 100 }; // 上半分
      const end: Point = { x: 200, y: 100 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      expect(params.normalizedY).toBe(-0.5);
    });

    it('下半分でnormalizedYが正の値になること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 300 }; // 下半分
      const end: Point = { x: 200, y: 300 };
      const params = result.current.calculateGestureParams(start, end, canvasHeight);

      expect(params.normalizedY).toBe(0.5);
    });
  });

  describe('clearCanvas', () => {
    it('キャンバスがクリアされパスがリセットされること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      // Mock canvas element
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(mockContext),
        width: 800,
        height: 400,
      } as unknown as HTMLCanvasElement;

      // Set ref manually for testing
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      act(() => {
        result.current.clearCanvas();
      });

      expect(mockClearRect).toHaveBeenCalledWith(0, 0, 800, 400);
      expect(result.current.currentPath).toEqual([]);
    });
  });

  describe('getCanvasPoint', () => {
    it('イベント座標をキャンバス座標に変換すること', () => {
      const { result } = renderHook(() => useGestureCanvas());

      // Mock canvas element
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(mockContext),
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 50,
          width: 800,
          height: 400,
        }),
        width: 800,
        height: 400,
      } as unknown as HTMLCanvasElement;

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      const point = result.current.getCanvasPoint(200, 150);

      // 200 - 100 = 100, 150 - 50 = 100
      expect(point.x).toBe(100);
      expect(point.y).toBe(100);
    });
  });
});
