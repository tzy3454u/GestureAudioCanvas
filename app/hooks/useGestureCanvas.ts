'use client';

import { useState, useCallback, useRef, RefObject } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface GestureParams {
  distance: number;
  isRightward: boolean;
  normalizedY: number;
}

export interface GestureData {
  startPoint: Point;
  endPoint: Point;
  path: Point[];
  distance: number;
}

export interface GestureCanvasHook {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isDrawing: boolean;
  currentPath: Point[];
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => GestureData | null;
  clearCanvas: () => void;
  calculateGestureParams: (start: Point, end: Point, canvasHeight: number) => GestureParams;
  getCanvasPoint: (clientX: number, clientY: number) => Point;
}

const STROKE_COLOR = '#2196F3';
const STROKE_WIDTH = 3;

/**
 * キャンバス上のジェスチャーを検出しパラメータに変換するカスタムフック
 */
export function useGestureCanvas(): GestureCanvasHook {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);

  /**
   * クライアント座標をキャンバス座標に変換する
   */
  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  /**
   * キャンバスをクリアしパスをリセットする
   */
  const clearCanvas = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCurrentPath([]);
    startPointRef.current = null;
  }, []);

  /**
   * 2点間のジェスチャーパラメータを計算する
   */
  const calculateGestureParams = useCallback(
    (start: Point, end: Point, canvasHeight: number): GestureParams => {
      // 始点から終点までの直線距離
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // X方向が正（右向き）かどうか
      const isRightward = dx >= 0;

      // Y座標を-1（上端）〜1（下端）に正規化
      const centerY = canvasHeight / 2;
      const normalizedY = (start.y - centerY) / centerY;

      return {
        distance,
        isRightward,
        normalizedY,
      };
    },
    []
  );

  /**
   * 軌跡を描画する
   */
  const drawPath = useCallback((points: Point[]): void => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
  }, []);

  /**
   * ポインターダウンイベントハンドラ
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      const point = getCanvasPoint(e.clientX, e.clientY);
      startPointRef.current = point;
      setIsDrawing(true);
      setCurrentPath([point]);

      // 始点にマーカーを描画
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = STROKE_COLOR;
      ctx.beginPath();
      ctx.arc(point.x, point.y, STROKE_WIDTH, 0, Math.PI * 2);
      ctx.fill();
    },
    [getCanvasPoint]
  );

  /**
   * ポインタームーブイベントハンドラ
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      if (!isDrawing) return;

      const point = getCanvasPoint(e.clientX, e.clientY);
      const newPath = [...currentPath, point];
      setCurrentPath(newPath);

      // 軌跡を描画
      if (newPath.length >= 2) {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const prevPoint = newPath[newPath.length - 2];
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineWidth = STROKE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    },
    [isDrawing, currentPath, getCanvasPoint]
  );

  /**
   * ポインターアップイベントハンドラ
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): GestureData | null => {
      if (!isDrawing || !startPointRef.current) {
        setIsDrawing(false);
        return null;
      }

      const endPoint = getCanvasPoint(e.clientX, e.clientY);
      const startPoint = startPointRef.current;
      const path = [...currentPath, endPoint];

      // 距離を計算
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const gestureData: GestureData = {
        startPoint,
        endPoint,
        path,
        distance,
      };

      setIsDrawing(false);

      return gestureData;
    },
    [isDrawing, currentPath, getCanvasPoint]
  );

  return {
    canvasRef,
    isDrawing,
    currentPath,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    clearCanvas,
    calculateGestureParams,
    getCanvasPoint,
  };
}
