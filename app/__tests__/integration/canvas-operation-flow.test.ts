/**
 * キャンバス操作フロー統合テスト
 * Task 7.3: キャンバス操作フローの検証
 * - 軌跡描画の動作を確認
 * - ジェスチャー完了から再生開始までの連携を確認
 * - 再生完了後のクリアと再入力可能状態への遷移を確認
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.4
 */

import { renderHook, act } from '@testing-library/react';
import { useGestureCanvas, Point, GestureData, GestureParams } from '@/hooks/useGestureCanvas';

// Canvas 2D Context モック
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

// モックキャンバス要素を作成するヘルパー
function createMockCanvas(
  left: number = 0,
  top: number = 0,
  width: number = 800,
  height: number = 400
) {
  return {
    getContext: jest.fn().mockReturnValue(mockContext),
    getBoundingClientRect: jest.fn().mockReturnValue({
      left,
      top,
      width,
      height,
    }),
    width,
    height,
  } as unknown as HTMLCanvasElement;
}

describe('キャンバス操作フロー統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Req 2.1, 2.2, 2.3: キャンバスの表示と操作', () => {
    it('canvasRefが正しく作成される', () => {
      const { result } = renderHook(() => useGestureCanvas());
      expect(result.current.canvasRef).toBeDefined();
    });

    it('初期状態でisDrawingがfalse', () => {
      const { result } = renderHook(() => useGestureCanvas());
      expect(result.current.isDrawing).toBe(false);
    });

    it('初期状態でcurrentPathが空配列', () => {
      const { result } = renderHook(() => useGestureCanvas());
      expect(result.current.currentPath).toEqual([]);
    });
  });

  describe('Req 3.1: 始点記録', () => {
    it('ポインターダウンで始点を記録しisDrawingがtrueになる', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      const mockEvent = {
        clientX: 100,
        clientY: 200,
      } as React.PointerEvent<HTMLCanvasElement>;

      act(() => {
        result.current.handlePointerDown(mockEvent);
      });

      expect(result.current.isDrawing).toBe(true);
      expect(result.current.currentPath.length).toBe(1);
      expect(result.current.currentPath[0]).toEqual({ x: 100, y: 200 });
    });
  });

  describe('Req 3.2: 軌跡描画', () => {
    it('ポインタームーブで軌跡が記録される', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      // 始点をセット
      act(() => {
        result.current.handlePointerDown({
          clientX: 100,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      // 軌跡を追加
      act(() => {
        result.current.handlePointerMove({
          clientX: 150,
          clientY: 250,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      expect(result.current.currentPath.length).toBe(2);
      expect(result.current.currentPath[1]).toEqual({ x: 150, y: 250 });
    });

    it('ドラッグ中でない場合はポインタームーブで軌跡が追加されない', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      // ポインターダウンせずにムーブ
      act(() => {
        result.current.handlePointerMove({
          clientX: 150,
          clientY: 250,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      expect(result.current.currentPath.length).toBe(0);
    });
  });

  describe('Req 3.3: 終点記録', () => {
    it('ポインターアップで終点を記録しGestureDataを返す', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      // ドラッグ開始
      act(() => {
        result.current.handlePointerDown({
          clientX: 100,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      // ドラッグ中
      act(() => {
        result.current.handlePointerMove({
          clientX: 200,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      // ドラッグ終了
      let gestureData: GestureData | null = null;
      act(() => {
        gestureData = result.current.handlePointerUp({
          clientX: 300,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      expect(gestureData).not.toBeNull();
      expect(gestureData!.startPoint).toEqual({ x: 100, y: 200 });
      expect(gestureData!.endPoint).toEqual({ x: 300, y: 200 });
      expect(gestureData!.distance).toBe(200);
      expect(result.current.isDrawing).toBe(false);
    });

    it('ドラッグ中でない場合はポインターアップでnullを返す', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      let gestureData: GestureData | null = null;
      act(() => {
        gestureData = result.current.handlePointerUp({
          clientX: 300,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      expect(gestureData).toBeNull();
    });
  });

  describe('Req 7.2: キャンバスクリア', () => {
    it('clearCanvasでキャンバスがクリアされパスがリセットされる', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      // パスを追加
      act(() => {
        result.current.handlePointerDown({
          clientX: 100,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      expect(result.current.currentPath.length).toBeGreaterThan(0);

      // クリア
      act(() => {
        result.current.clearCanvas();
      });

      expect(mockClearRect).toHaveBeenCalledWith(0, 0, 800, 400);
      expect(result.current.currentPath).toEqual([]);
    });
  });

  describe('ジェスチャーパラメータ計算', () => {
    const CANVAS_HEIGHT = 400;

    it('始点から終点までの直線距離を計算する', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 0, y: 0 };
      const end: Point = { x: 30, y: 40 };
      const params = result.current.calculateGestureParams(start, end, CANVAS_HEIGHT);

      // sqrt(30^2 + 40^2) = 50
      expect(params.distance).toBe(50);
    });

    it('右方向のジェスチャーでisRightwardがtrue', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 200 };
      const end: Point = { x: 200, y: 200 };
      const params = result.current.calculateGestureParams(start, end, CANVAS_HEIGHT);

      expect(params.isRightward).toBe(true);
    });

    it('左方向のジェスチャーでisRightwardがfalse', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 200, y: 200 };
      const end: Point = { x: 100, y: 200 };
      const params = result.current.calculateGestureParams(start, end, CANVAS_HEIGHT);

      expect(params.isRightward).toBe(false);
    });

    it('キャンバス上端でnormalizedYが-1', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 0 };
      const end: Point = { x: 200, y: 0 };
      const params = result.current.calculateGestureParams(start, end, CANVAS_HEIGHT);

      expect(params.normalizedY).toBe(-1);
    });

    it('キャンバス中央でnormalizedYが0', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 200 };
      const end: Point = { x: 200, y: 200 };
      const params = result.current.calculateGestureParams(start, end, CANVAS_HEIGHT);

      expect(params.normalizedY).toBe(0);
    });

    it('キャンバス下端でnormalizedYが1', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const start: Point = { x: 100, y: 400 };
      const end: Point = { x: 200, y: 400 };
      const params = result.current.calculateGestureParams(start, end, CANVAS_HEIGHT);

      expect(params.normalizedY).toBe(1);
    });
  });

  describe('座標変換', () => {
    it('クライアント座標をキャンバス座標に変換する', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas(100, 50, 800, 400);

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      const point = result.current.getCanvasPoint(200, 150);

      // 200 - 100 = 100, 150 - 50 = 100
      expect(point.x).toBe(100);
      expect(point.y).toBe(100);
    });

    it('キャンバスがnullの場合は(0,0)を返す', () => {
      const { result } = renderHook(() => useGestureCanvas());

      const point = result.current.getCanvasPoint(200, 150);

      expect(point.x).toBe(0);
      expect(point.y).toBe(0);
    });
  });

  describe('完全なジェスチャーフロー', () => {
    it('開始→移動→終了の完全なフローが正しく動作する', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      // 1. 開始
      act(() => {
        result.current.handlePointerDown({
          clientX: 100,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });
      expect(result.current.isDrawing).toBe(true);

      // 2. 移動（複数回）
      act(() => {
        result.current.handlePointerMove({
          clientX: 150,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });
      act(() => {
        result.current.handlePointerMove({
          clientX: 200,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });
      act(() => {
        result.current.handlePointerMove({
          clientX: 250,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });
      expect(result.current.currentPath.length).toBe(4);

      // 3. 終了
      let gestureData: GestureData | null = null;
      act(() => {
        gestureData = result.current.handlePointerUp({
          clientX: 300,
          clientY: 200,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      expect(result.current.isDrawing).toBe(false);
      expect(gestureData).not.toBeNull();
      expect(gestureData!.startPoint).toEqual({ x: 100, y: 200 });
      expect(gestureData!.endPoint).toEqual({ x: 300, y: 200 });
      expect(gestureData!.distance).toBe(200);
      expect(gestureData!.path.length).toBe(5); // 4移動 + 終点

      // 4. クリア
      act(() => {
        result.current.clearCanvas();
      });
      expect(result.current.currentPath).toEqual([]);
    });

    it('斜め方向のジェスチャーで正しい距離が計算される', () => {
      const { result } = renderHook(() => useGestureCanvas());
      const mockCanvas = createMockCanvas();

      Object.defineProperty(result.current.canvasRef, 'current', {
        value: mockCanvas,
        writable: true,
      });

      act(() => {
        result.current.handlePointerDown({
          clientX: 0,
          clientY: 0,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      let gestureData: GestureData | null = null;
      act(() => {
        gestureData = result.current.handlePointerUp({
          clientX: 300,
          clientY: 400,
        } as React.PointerEvent<HTMLCanvasElement>);
      });

      // sqrt(300^2 + 400^2) = 500
      expect(gestureData!.distance).toBe(500);
    });
  });
});
