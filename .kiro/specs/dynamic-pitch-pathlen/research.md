# Research & Design Decisions

## Summary
- **Feature**: `dynamic-pitch-pathlen`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - Web Audio APIの`setValueCurveAtTime`を使用して、再生中に動的にplaybackRateを変化可能
  - 既存の`useGestureCanvas`は軌跡の`path`配列を既に記録しており、累積距離計算に再利用可能
  - 既存の`useAudioProcessor`の`playAudio`メソッドを拡張して動的ピッチ対応が可能

## Research Log

### Web Audio API 動的ピッチ変更
- **Context**: 再生中にピッチ（playbackRate）を動的に変更する方法の調査
- **Sources Consulted**:
  - [MDN AudioBufferSourceNode: playbackRate](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/playbackRate)
  - [MDN AudioParam: setValueCurveAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueCurveAtTime)
- **Findings**:
  - `playbackRate`は`AudioParam`型で、`setValueCurveAtTime(values, startTime, duration)`で曲線に沿った変更が可能
  - `values`はFloat32Arrayで最低2要素必要
  - 値は指定期間内で線形補間される
  - Chrome 46以降でサポート（2015年〜）
- **Implications**: 軌跡の各点のY座標からピッチ値配列を生成し、`setValueCurveAtTime`で適用することで動的ピッチ変化を実現

### 既存コードベース分析
- **Context**: 統合ポイントと変更範囲の特定
- **Sources Consulted**:
  - `app/hooks/useAudioProcessor.ts`
  - `app/hooks/useGestureCanvas.ts`
  - `app/app/main/page.tsx`
- **Findings**:
  - `GestureData.path: Point[]` - 軌跡の全点を既に記録している
  - `calculatePitchRate(normalizedY)` - Y座標からピッチを計算する関数が存在
  - `calculateDurationRate(distance, canvasWidth)` - 距離から再生時間倍率を計算
  - `PlaybackParams` - `isReverse`, `durationRate`, `pitchRate`を含むが、動的ピッチには対応していない
- **Implications**:
  - `GestureData`に累積距離情報を追加する必要あり
  - `PlaybackParams`を拡張して動的ピッチデータを渡す
  - `playAudio`を拡張して`setValueCurveAtTime`を使用

### 累積距離計算
- **Context**: 軌跡総線分長と各点の累積距離を計算するアルゴリズム
- **Sources Consulted**: 既存コード分析
- **Findings**:
  - 現在の`distance`計算は始点-終点間の直線距離のみ
  - 軌跡総線分長 = Σ(各セグメントのユークリッド距離)
  - 累積距離配列を生成して、再生進行と軌跡位置を対応付ける
- **Implications**: `useGestureCanvas`に累積距離計算ロジックを追加

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| setValueCurveAtTime | playbackRateに値配列を設定 | シンプル、ブラウザネイティブ | 一度設定したら変更不可 | 採用 |
| 複数AudioBufferSourceNode | 区間ごとにノードを作成 | 柔軟性が高い | 複雑、ノード切り替え時のギャップ | 不採用 |
| AudioWorklet | カスタムプロセッサ | 最大の柔軟性 | 実装複雑、パフォーマンス考慮必要 | オーバーエンジニアリング |

## Design Decisions

### Decision: 動的ピッチ実装方式
- **Context**: 軌跡に沿ってピッチを動的に変化させる技術的アプローチ
- **Alternatives Considered**:
  1. `setValueCurveAtTime` - 値配列による曲線設定
  2. 複数AudioBufferSourceNode - 区間分割再生
  3. `setValueAtTime`ループ - タイマーベースの逐次設定
- **Selected Approach**: `setValueCurveAtTime`を使用
- **Rationale**:
  - ブラウザネイティブの最適化された補間
  - 単一のAudioBufferSourceNodeで完結
  - コード変更が最小限
- **Trade-offs**: 再生開始後の曲線変更は不可だが、本ユースケースでは問題なし
- **Follow-up**: サンプリング間隔の最適値を実装時に検証

### Decision: 逆再生機能の廃止
- **Context**: 要件4に基づき、X座標方向による再生方向の違いを廃止
- **Alternatives Considered**:
  1. 逆再生維持 + 動的ピッチ
  2. 逆再生廃止（採用）
- **Selected Approach**: 逆再生機能を完全に廃止
- **Rationale**:
  - 仕様の簡素化
  - 動的ピッチと逆再生の組み合わせは複雑
  - `isReverse`パラメータと`reversedBuffer`は不要になる
- **Trade-offs**: 既存機能の削除となるが、破壊的変更として許容
- **Follow-up**: `isReversePlayback`関数と関連コードを削除

### Decision: ピッチ範囲の変更
- **Context**: 要件1.6に基づき、ピッチ範囲を0.25-4.0から1.0-5.0に変更
- **Selected Approach**: `MIN_PITCH_RATE = 1.0`, `MAX_PITCH_RATE = 5.0`
- **Rationale**: ユーザー要求に基づく仕様変更
- **Trade-offs**: 低ピッチ（遅い再生）が不可になる
- **Follow-up**: `calculatePitchRate`の計算式を修正

## Risks & Mitigations
- **Risk 1**: setValueCurveAtTimeのブラウザ互換性 — Chrome/Firefox/Safari/Edgeで2015年以降サポート、問題なし
- **Risk 2**: 軌跡点数が多い場合のパフォーマンス — サンプリング間隔を調整して点数を制限（100-200点程度）
- **Risk 3**: 既存テストの破壊 — 逆再生関連テストの削除・修正が必要

## References
- [MDN AudioBufferSourceNode: playbackRate](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/playbackRate) — playbackRateの基本情報
- [MDN AudioParam: setValueCurveAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueCurveAtTime) — 動的値変更の実装方法
- [MDN AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) — ノード全体の仕様
