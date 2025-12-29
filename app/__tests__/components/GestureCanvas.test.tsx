'use client';

import { render, screen, fireEvent } from '@testing-library/react';
import { GestureCanvas } from '@/components/GestureCanvas';
import { GestureData } from '@/hooks/useGestureCanvas';

// Mock canvas getContext
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

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext);
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
  left: 0,
  top: 0,
  width: 800,
  height: 400,
});

describe('GestureCanvas', () => {
  const mockOnGestureComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('表示', () => {
    it('キャンバス要素がレンダリングされること', () => {
      render(
        <GestureCanvas
          isEnabled={true}
          isPlaying={false}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('無効状態の時にオーバーレイが表示されること', () => {
      render(
        <GestureCanvas
          isEnabled={false}
          isPlaying={false}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      expect(screen.getByText('音声をロードしてください')).toBeInTheDocument();
    });

    it('有効状態の時にオーバーレイが表示されないこと', () => {
      render(
        <GestureCanvas
          isEnabled={true}
          isPlaying={false}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      expect(screen.queryByText('音声をロードしてください')).not.toBeInTheDocument();
    });

    it('再生中の時にオーバーレイが表示されること', () => {
      render(
        <GestureCanvas
          isEnabled={true}
          isPlaying={true}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      expect(screen.getByText('再生中...')).toBeInTheDocument();
    });
  });

  describe('ポインターイベント', () => {
    it('無効状態の時にポインターイベントが無視されること', () => {
      render(
        <GestureCanvas
          isEnabled={false}
          isPlaying={false}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      const canvas = document.querySelector('canvas')!;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 100 });

      expect(mockOnGestureComplete).not.toHaveBeenCalled();
    });

    it('再生中の時にポインターイベントが無視されること', () => {
      render(
        <GestureCanvas
          isEnabled={true}
          isPlaying={true}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      const canvas = document.querySelector('canvas')!;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 100 });

      expect(mockOnGestureComplete).not.toHaveBeenCalled();
    });

    it('有効状態でドラッグ完了時にonGestureCompleteが呼ばれること', () => {
      render(
        <GestureCanvas
          isEnabled={true}
          isPlaying={false}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      const canvas = document.querySelector('canvas')!;

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 100 });
      fireEvent.pointerUp(canvas, { clientX: 200, clientY: 100 });

      expect(mockOnGestureComplete).toHaveBeenCalledTimes(1);
      expect(mockOnGestureComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          startPoint: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
          endPoint: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
          path: expect.any(Array),
          distance: expect.any(Number),
        })
      );
    });
  });

  describe('キャンバスサイズ', () => {
    it('デフォルトサイズで描画されること', () => {
      render(
        <GestureCanvas
          isEnabled={true}
          isPlaying={false}
          onGestureComplete={mockOnGestureComplete}
        />
      );

      const canvas = document.querySelector('canvas')!;
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '400');
    });

    it('カスタムサイズで描画されること', () => {
      render(
        <GestureCanvas
          isEnabled={true}
          isPlaying={false}
          onGestureComplete={mockOnGestureComplete}
          width={600}
          height={300}
        />
      );

      const canvas = document.querySelector('canvas')!;
      expect(canvas).toHaveAttribute('width', '600');
      expect(canvas).toHaveAttribute('height', '300');
    });
  });
});
