'use client';

import { useState, useCallback, useRef } from 'react';

export interface PlaybackParams {
  isReverse: boolean;
  durationRate: number;
  pitchRate: number;
}

export interface AudioProcessorHook {
  audioBuffer: AudioBuffer | null;
  reversedBuffer: AudioBuffer | null;
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;

  initializeAudioContext: () => Promise<void>;
  loadAudioFile: (file: File) => Promise<void>;
  loadSampleAudio: () => Promise<void>;
  playAudio: (params: PlaybackParams) => void;
  stopAudio: () => void;
  calculateDurationRate: (distance: number) => number;
  calculatePitchRate: (normalizedY: number) => number;
  isReversePlayback: (xDelta: number) => boolean;
}

const SAMPLE_DURATION = 5; // seconds
const SAMPLE_FREQUENCY = 440; // Hz (A4)
const BASE_DISTANCE_PX = 20;
const MIN_PITCH_RATE = 0.25;
const MAX_PITCH_RATE = 4.0;

/**
 * Web Audio APIを使用して音声を処理するカスタムフック
 */
export function useAudioProcessor(): AudioProcessorHook {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [reversedBuffer, setReversedBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AudioContextの初期化に失敗しました';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * AudioBufferを逆順に反転する
   */
  const reverseAudioBuffer = useCallback((buffer: AudioBuffer): AudioBuffer => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      throw new Error('AudioContextが初期化されていません');
    }

    const reversedBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const originalData = buffer.getChannelData(channel);
      const reversedData = reversedBuffer.getChannelData(channel);

      for (let i = 0; i < buffer.length; i++) {
        reversedData[i] = originalData[buffer.length - 1 - i];
      }
    }

    return reversedBuffer;
  }, []);

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

      // 逆再生用バッファも生成
      const reversed = reverseAudioBuffer(buffer);

      setAudioBuffer(buffer);
      setReversedBuffer(reversed);
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声ファイルの読み込みに失敗しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [initializeAudioContext, reverseAudioBuffer]);

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

      // 逆再生用バッファも生成
      const reversed = reverseAudioBuffer(buffer);

      setAudioBuffer(buffer);
      setReversedBuffer(reversed);
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声ファイルの読み込みに失敗しました';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [initializeAudioContext, reverseAudioBuffer]);

  /**
   * 線の長さから再生時間倍率を計算する
   * 20px = 元の音声長さ（1.0倍）
   */
  const calculateDurationRate = useCallback((distance: number): number => {
    return distance / BASE_DISTANCE_PX;
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
   * X方向の移動量から再生方向を判定する
   * 正（右向き）: 順再生（false）
   * 負（左向き）: 逆再生（true）
   */
  const isReversePlayback = useCallback((xDelta: number): boolean => {
    return xDelta < 0;
  }, []);

  /**
   * 音声を再生する
   */
  const playAudio = useCallback((params: PlaybackParams): void => {
    const ctx = audioContextRef.current;
    if (!ctx) {
      setError('AudioContextが初期化されていません');
      return;
    }

    const bufferToPlay = params.isReverse ? reversedBuffer : audioBuffer;
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

      // playbackRateはピッチと速度の両方に影響する
      // durationRate（時間倍率）の逆数とpitchRateを掛け合わせる
      // durationRate=2（2倍長い）→ playbackRate=0.5（遅く再生）
      // pitchRate=2（高いピッチ）→ playbackRate=2（速く再生）
      const effectiveRate = params.pitchRate / params.durationRate;
      source.playbackRate.value = effectiveRate > 0 ? effectiveRate : 0.01;

      source.connect(ctx.destination);

      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      sourceNodeRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声の再生に失敗しました';
      setError(message);
    }
  }, [audioBuffer, reversedBuffer]);

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

  return {
    audioBuffer,
    reversedBuffer,
    isLoading,
    isPlaying,
    error,
    initializeAudioContext,
    loadAudioFile,
    loadSampleAudio,
    playAudio,
    stopAudio,
    calculateDurationRate,
    calculatePitchRate,
    isReversePlayback,
  };
}
