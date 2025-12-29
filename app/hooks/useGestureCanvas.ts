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
  /** 軌跡の総線分長（全セグメント長の合計） */
  pathLength: number;
  /** 各点の累積距離（始点からの距離）*/
  cumulativeDistances: number[];
}

export interface PathMetrics {
  pathLength: number;
  cumulativeDistances: number[];
}

/**
 * 軌跡の総線分長と累積距離配列を計算する
 * @param path - 軌跡の点配列
 * @returns pathLength（総線分長）とcumulativeDistances（累積距離配列）
 */
export function calculatePathMetrics(path: Point[]): PathMetrics {
  if (path.length === 0) {
    return { pathLength: 0, cumulativeDistances: [] };
  }

  if (path.length === 1) {
    return { pathLength: 0, cumulativeDistances: [0] };
  }

  const cumulativeDistances: number[] = [0];
  let totalLength = 0;

  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    totalLength += segmentLength;
    cumulativeDistances.push(totalLength);
  }

  return {
    pathLength: totalLength,
    cumulativeDistances,
  };
}

export interface GestureCanvasHook {
  canvasRef: RefObject<HTMLCanvasElement>;
  isDrawing: boolean;
  currentPath: Point[];
  handlePointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => GestureData | null;
  handlePointerLeave: (e: React.PointerEvent<HTMLCanvasElement>) => GestureData | null;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const startPointRef = useRef<Point | null>(null);
  // マルチタッチ制御: 最初のタッチのpointerIdを追跡
  const activePointerIdRef = useRef<number | null>(null);

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
    activePointerIdRef.current = null;
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
   * マルチタッチ時は最初のタッチポイントのみを追跡
   */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      // マルチタッチ制御: 既にアクティブなポインターがある場合は無視
      if (activePointerIdRef.current !== null) {
        return;
      }

      // 最初のタッチのpointerIdを記録
      activePointerIdRef.current = e.pointerId;

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
   * マルチタッチ時は最初のタッチポイントのみを追跡
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): void => {
      // マルチタッチ制御: アクティブなポインター以外は無視
      if (!isDrawing || e.pointerId !== activePointerIdRef.current) return;

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
   * マルチタッチ時は最初のタッチポイントのみを処理
   */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): GestureData | null => {
      // マルチタッチ制御: アクティブなポインター以外は無視
      if (e.pointerId !== activePointerIdRef.current) {
        return null;
      }

      if (!isDrawing || !startPointRef.current) {
        setIsDrawing(false);
        activePointerIdRef.current = null;
        return null;
      }

      const endPoint = getCanvasPoint(e.clientX, e.clientY);
      const startPoint = startPointRef.current;
      const path = [...currentPath, endPoint];

      // 直線距離を計算（後方互換性のため維持）
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 累積距離と総線分長を計算
      const { pathLength, cumulativeDistances } = calculatePathMetrics(path);

      const gestureData: GestureData = {
        startPoint,
        endPoint,
        path,
        distance,
        pathLength,
        cumulativeDistances,
      };

      setIsDrawing(false);
      activePointerIdRef.current = null;

      return gestureData;
    },
    [isDrawing, currentPath, getCanvasPoint]
  );

  /**
   * キャンバス座標をキャンバス境界内にクランプする
   */
  const clampToCanvas = useCallback((point: Point): Point => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return point;
    }

    return {
      x: Math.max(0, Math.min(point.x, canvas.width)),
      y: Math.max(0, Math.min(point.y, canvas.height)),
    };
  }, []);

  /**
   * ポインターリーブイベントハンドラ
   * キャンバス外へドラッグした場合にジェスチャーを正常に完了させる
   * マルチタッチ時は最初のタッチポイントのみを処理
   */
  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): GestureData | null => {
      // マルチタッチ制御: アクティブなポインター以外は無視
      if (e.pointerId !== activePointerIdRef.current) {
        return null;
      }

      if (!isDrawing || !startPointRef.current) {
        return null;
      }

      // キャンバス外の座標をキャンバス境界にクランプ
      const rawPoint = getCanvasPoint(e.clientX, e.clientY);
      const endPoint = clampToCanvas(rawPoint);
      const startPoint = startPointRef.current;
      const path = [...currentPath, endPoint];

      // 直線距離を計算
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 累積距離と総線分長を計算
      const { pathLength, cumulativeDistances } = calculatePathMetrics(path);

      const gestureData: GestureData = {
        startPoint,
        endPoint,
        path,
        distance,
        pathLength,
        cumulativeDistances,
      };

      setIsDrawing(false);
      activePointerIdRef.current = null;

      return gestureData;
    },
    [isDrawing, currentPath, getCanvasPoint, clampToCanvas]
  );

  return {
    canvasRef,
    isDrawing,
    currentPath,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    clearCanvas,
    calculateGestureParams,
    getCanvasPoint,
  };
}
