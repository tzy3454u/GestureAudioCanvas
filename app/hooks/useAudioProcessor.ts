'use client';

import { useState, useCallback, useRef } from 'react';
import type { Point } from './useGestureCanvas';


/** 動的ピッチ再生用パラメータ */
export interface DynamicPlaybackParams {
  /** 再生時間倍率（pathLengthから算出） */
  durationRate: number;
  /** ピッチ曲線（Float32Array形式、setValueCurveAtTime用） */
  pitchCurve: Float32Array;
  /** 再生時間（秒） */
  duration: number;
}

/** 静的ピッチ再生用パラメータ（フォールバック用） */
export interface StaticPlaybackParams {
  durationRate: number;
  pitchRate: number;
}

export interface AudioProcessorHook {
  audioBuffer: AudioBuffer | null;
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  volume: number;

  initializeAudioContext: () => Promise<void>;
  loadAudioFile: (file: File) => Promise<void>;
  loadSampleAudio: () => Promise<void>;
  setAudioBufferExternal: (buffer: AudioBuffer) => Promise<void>;
  stopAudio: () => void;
  setVolumeLevel: (volume: number) => void;
  /**
   * 軌跡総線分長とキャンバス幅から再生時間倍率を計算する
   * @param pathLength - 軌跡の総線分長（ピクセル）
   * @param canvasWidth - キャンバスの幅（ピクセル）
   * @returns 再生時間倍率（1.0 = 元の音声長さ）
   */
  calculateDurationRate: (pathLength: number, canvasWidth: number) => number;
  calculatePitchRate: (normalizedY: number) => number;
  /**
   * Y座標からピッチ倍率を計算する（新計算式）
   * @param y - Y座標（ピクセル）
   * @param canvasHeight - キャンバスの高さ（ピクセル）
   * @returns ピッチ倍率（1.0〜5.0）
   */
  calculatePitchFromY: (y: number, canvasHeight: number) => number;
  /**
   * 軌跡からピッチ曲線を生成
   * @param path - 軌跡の点配列
   * @param canvasHeight - キャンバスの高さ
   * @param sampleCount - サンプル数（デフォルト100）
   * @returns Float32Array形式のピッチ曲線
   */
  generatePitchCurve: (path: Point[], canvasHeight: number, sampleCount?: number) => Float32Array;
  /**
   * 動的ピッチで音声を再生
   * setValueCurveAtTimeを使用してplaybackRateにピッチ曲線を設定
   */
  playAudioWithDynamicPitch: (params: DynamicPlaybackParams) => void;
  /**
   * 静的ピッチで音声を再生（フォールバック用）
   * 常に順再生、単一のpitchRateを適用
   */
  playAudioWithStaticPitch: (params: StaticPlaybackParams) => void;
}

const SAMPLE_DURATION = 5; // seconds
const SAMPLE_FREQUENCY = 440; // Hz (A4)
const DEFAULT_CANVAS_WIDTH = 800; // デフォルトのキャンバス幅（px）
const DEFAULT_CANVAS_HEIGHT = 600; // デフォルトのキャンバス高さ（px）
const MIN_PITCH_RATE = 0.25;
const MAX_PITCH_RATE = 4.0;
// 新ピッチ計算用の定数（Y座標ベース）
const NEW_MIN_PITCH_RATE = 1.0;
const NEW_MAX_PITCH_RATE = 5.0;

/**
 * Web Audio APIを使用して音声を処理するカスタムフック
 */
export function useAudioProcessor(): AudioProcessorHook {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [volume, setVolume] = useState(0.5);

  /**
   * AudioContextを初期化する
   * ブラウザ互換性のためwebkitAudioContextもサポート
   */
  const initializeAudioContext = useCallback(async (): Promise<void> => {
    if (audioContextRef.current) {
      // 既に初期化されている場合はresumeのみ行う
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('お使いのブラウザは音声再生に対応していません');
      }
      audioContextRef.current = new AudioContextClass();
      // GainNodeを作成して接続
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
      gainNodeRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AudioContextの初期化に失敗しました';
      setError(message);
      throw err;
    }
  }, [volume]);

  /**
   * 5秒間のサイン波サンプル音源を生成する
   */
  const loadSampleAudio = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await initializeAudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('AudioContextが初期化されていません');
      }

      const sampleRate = ctx.sampleRate;
      const length = sampleRate * SAMPLE_DURATION;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const channelData = buffer.getChannelData(0);

      // サイン波を生成
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        channelData[i] = Math.sin(2 * Math.PI * SAMPLE_FREQUENCY * t) * 0.5;
      }

      setAudioBuffer(buffer);
      audioBufferRef.current = buffer;
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声ファイルの読み込みに失敗しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [initializeAudioContext]);

  /**
   * 外部からAudioBufferを設定する
   */
  const setAudioBufferExternal = useCallback(async (buffer: AudioBuffer): Promise<void> => {
    try {
      await initializeAudioContext();
      setAudioBuffer(buffer);
      audioBufferRef.current = buffer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AudioBufferの設定に失敗しました';
      setError(message);
      throw err;
    }
  }, [initializeAudioContext]);

  /**
   * 音声ファイルをロードしてデコードする
   */
  const loadAudioFile = useCallback(async (file: File): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await initializeAudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) {
        throw new Error('AudioContextが初期化されていません');
      }

      // ファイルをArrayBufferとして読み込む
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('ファイルの読み込みに失敗しました'));
          }
        };
        reader.onerror = () => {
          reject(new Error('ファイルの読み込みに失敗しました'));
        };
        reader.readAsArrayBuffer(file);
      });

      // ArrayBufferをAudioBufferにデコード
      const buffer = await ctx.decodeAudioData(arrayBuffer);

      setAudioBuffer(buffer);
      audioBufferRef.current = buffer;
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声ファイルの読み込みに失敗しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [initializeAudioContext]);

  /**
   * 軌跡総線分長とキャンバス幅から再生時間倍率を計算する
   * キャンバス幅の半分 = 元の音声長さ（1.0倍）
   * 曲線軌跡は直線距離より長いため、より長い再生時間倍率を返す
   * @param pathLength - 軌跡の総線分長（ピクセル）
   * @param canvasWidth - キャンバスの幅（ピクセル）
   * @returns 再生時間倍率（1.0 = 元の音声長さ）
   */
  const calculateDurationRate = useCallback((pathLength: number, canvasWidth: number): number => {
    // キャンバス幅が0以下の場合はデフォルト値を使用
    const effectiveCanvasWidth = canvasWidth > 0 ? canvasWidth : DEFAULT_CANVAS_WIDTH;
    // 基準距離はキャンバス幅の半分
    const baseDistance = effectiveCanvasWidth / 2;
    return pathLength / baseDistance;
  }, []);

  /**
   * 正規化されたY座標からピッチ倍率を計算する
   * normalizedY: -1（上端）から 1（下端）
   * 結果: 0.25（2オクターブ下）から 4.0（2オクターブ上）
   */
  const calculatePitchRate = useCallback((normalizedY: number): number => {
    // normalizedYを-1〜1の範囲にクランプ
    const clampedY = Math.max(-1, Math.min(1, normalizedY));

    // -1 → 0.25, 0 → 1.0, 1 → 4.0 への指数変換
    // 対数スケールで計算: rate = 2^(clampedY * 2)
    const rate = Math.pow(2, clampedY * 2);

    // 最終的な範囲制限
    return Math.max(MIN_PITCH_RATE, Math.min(MAX_PITCH_RATE, rate));
  }, []);

  /**
   * Y座標からピッチ倍率を計算する（新計算式）
   * 上端(y=0) → 5.0倍, 下端(y=canvasHeight) → 1.0倍
   * @param y - Y座標（ピクセル）
   * @param canvasHeight - キャンバスの高さ（ピクセル）
   * @returns ピッチ倍率（1.0〜5.0）
   */
  const calculatePitchFromY = useCallback((y: number, canvasHeight: number): number => {
    // キャンバス高さが0以下の場合はデフォルト値を使用
    const effectiveCanvasHeight = canvasHeight > 0 ? canvasHeight : DEFAULT_CANVAS_HEIGHT;
    // Y座標を正規化（0.0〜1.0）
    const normalizedY = Math.max(0, Math.min(1, y / effectiveCanvasHeight));
    // 上端(y=0) → 5.0, 下端(y=canvasHeight) → 1.0
    const pitchRate = NEW_MAX_PITCH_RATE - (normalizedY * (NEW_MAX_PITCH_RATE - NEW_MIN_PITCH_RATE));
    // 範囲制限
    return Math.max(NEW_MIN_PITCH_RATE, Math.min(NEW_MAX_PITCH_RATE, pitchRate));
  }, []);

  /**
   * 軌跡からピッチ曲線を生成する
   * 累積距離に基づいてサンプリングし、Float32Arrayを返す
   * @param path - 軌跡の点配列
   * @param canvasHeight - キャンバスの高さ
   * @param sampleCount - サンプル数（デフォルト100）
   * @returns Float32Array形式のピッチ曲線
   */
  const generatePitchCurve = useCallback((path: Point[], canvasHeight: number, sampleCount: number = 100): Float32Array => {
    const pitchCurve = new Float32Array(sampleCount);
    const midPitch = (NEW_MIN_PITCH_RATE + NEW_MAX_PITCH_RATE) / 2; // 3.0

    // 空の軌跡の場合
    if (path.length === 0) {
      pitchCurve.fill(midPitch);
      return pitchCurve;
    }

    // 1点のみの場合
    if (path.length === 1) {
      const pitch = calculatePitchFromY(path[0].y, canvasHeight);
      pitchCurve.fill(pitch);
      return pitchCurve;
    }

    // 累積距離を計算
    const cumulativeDistances: number[] = [0];
    let totalLength = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      totalLength += segmentLength;
      cumulativeDistances.push(totalLength);
    }

    // 各サンプル位置のピッチを計算
    for (let i = 0; i < sampleCount; i++) {
      // サンプル位置の累積距離を計算
      const targetDistance = (i / (sampleCount - 1)) * totalLength;

      // 対応するセグメントを見つける
      let segmentIndex = 0;
      for (let j = 1; j < cumulativeDistances.length; j++) {
        if (cumulativeDistances[j] >= targetDistance) {
          segmentIndex = j - 1;
          break;
        }
        segmentIndex = j - 1;
      }

      // セグメント内での位置を補間
      const segmentStart = cumulativeDistances[segmentIndex];
      const segmentEnd = cumulativeDistances[segmentIndex + 1] ?? segmentStart;
      const segmentLength = segmentEnd - segmentStart;

      let y: number;
      if (segmentLength === 0) {
        y = path[segmentIndex].y;
      } else {
        const t = (targetDistance - segmentStart) / segmentLength;
        y = path[segmentIndex].y + t * (path[segmentIndex + 1].y - path[segmentIndex].y);
      }

      pitchCurve[i] = calculatePitchFromY(y, canvasHeight);
    }

    return pitchCurve;
  }, [calculatePitchFromY]);

  /**
   * 音声再生を停止する
   */
  const stopAudio = useCallback((): void => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // 既に停止している場合は無視
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  /**
   * 音量を設定する（0.0 〜 1.0）
   */
  const setVolumeLevel = useCallback((newVolume: number): void => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
  }, []);

  /**
   * 動的ピッチで音声を再生する
   * setValueCurveAtTimeを使用してplaybackRateにピッチ曲線を設定
   */
  const playAudioWithDynamicPitch = useCallback((params: DynamicPlaybackParams): void => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      setError('AudioContextが初期化されていません');
      return;
    }

    const bufferToPlay = audioBufferRef.current;
    if (!bufferToPlay) {
      setError('音声がロードされていません');
      return;
    }

    // 既存の再生を停止
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // 既に停止している場合は無視
      }
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = bufferToPlay;

      // durationRateに基づいて再生するバッファの長さを計算
      const baseDuration = bufferToPlay.duration;
      const bufferDurationToPlay = Math.min(params.durationRate * baseDuration, baseDuration);

      // setValueCurveAtTimeでピッチ曲線を適用
      // Web Audio APIのsetValueCurveAtTimeは再生開始時間と持続時間を指定
      const startTime = ctx.currentTime;
      source.playbackRate.setValueCurveAtTime(params.pitchCurve, startTime, bufferDurationToPlay);

      // GainNodeを経由して接続
      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(ctx.destination);
      }

      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      sourceNodeRef.current = source;
      source.start(0, 0, bufferDurationToPlay);
      setIsPlaying(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声の再生に失敗しました';
      setError(message);
    }
  }, []);

  /**
   * 静的ピッチで音声を再生する（フォールバック用）
   * 常に順再生、単一のpitchRateを適用
   */
  const playAudioWithStaticPitch = useCallback((params: StaticPlaybackParams): void => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      setError('AudioContextが初期化されていません');
      return;
    }

    const bufferToPlay = audioBufferRef.current;
    if (!bufferToPlay) {
      setError('音声がロードされていません');
      return;
    }

    // 既存の再生を停止
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // 既に停止している場合は無視
      }
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = bufferToPlay;

      // ピッチ倍率をplaybackRateに適用
      const playbackRate = params.pitchRate > 0 ? params.pitchRate : 0.01;
      source.playbackRate.value = playbackRate;

      // durationRateに基づいて再生するバッファの長さを計算
      const baseDuration = bufferToPlay.duration;
      const bufferDurationToPlay = Math.min(params.durationRate * baseDuration, baseDuration);

      // GainNodeを経由して接続
      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(ctx.destination);
      }

      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      sourceNodeRef.current = source;
      source.start(0, 0, bufferDurationToPlay);
      setIsPlaying(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声の再生に失敗しました';
      setError(message);
    }
  }, []);

  return {
    audioBuffer,
    isLoading,
    isPlaying,
    error,
    volume,
    initializeAudioContext,
    loadAudioFile,
    loadSampleAudio,
    setAudioBufferExternal,
    stopAudio,
    setVolumeLevel,
    calculateDurationRate,
    calculatePitchRate,
    calculatePitchFromY,
    generatePitchCurve,
    playAudioWithDynamicPitch,
    playAudioWithStaticPitch,
  };
}
