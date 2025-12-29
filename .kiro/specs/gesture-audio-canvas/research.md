# Research & Design Decisions

## Summary
- **Feature**: `gesture-audio-canvas`
- **Discovery Scope**: New Feature（グリーンフィールド）
- **Key Findings**:
  - Web Audio APIの`playbackRate`でピッチと速度を同時に変更可能（0.25〜4倍の範囲でピッチシフト実現）
  - 逆再生は`AudioBuffer`のサンプルデータを反転させて実装
  - Next.js 14/15の`output: 'export'`設定でFirebase Hosting対応の静的ファイル生成可能
  - Firebase Authentication（メール/パスワード）はクライアントサイドのみで実装可能

## Research Log

### Web Audio API: ピッチシフトと再生速度

- **Context**: 要件6で線の位置に基づくピッチ変換（0.25倍〜4倍）が必要
- **Sources Consulted**:
  - [MDN: AudioBufferSourceNode.playbackRate](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/playbackRate)
  - [Pitch shifting in Web Audio API](https://zpl.fi/pitch-shifting-in-web-audio-api/)
- **Findings**:
  - `AudioBufferSourceNode.playbackRate`でピッチと速度を同時に変更
  - playbackRate=2で1オクターブ上（2倍速）、0.5で1オクターブ下（0.5倍速）
  - 要件の0.25〜4倍は2オクターブ下〜2オクターブ上に相当
  - ピッチを変えずに速度だけ変える場合はPhase VocoderやGranular Synthesisが必要だが、本要件では不要
- **Implications**: `playbackRate`のみでピッチ変換を実装可能。追加ライブラリ不要

### Web Audio API: 逆再生

- **Context**: 要件5で線の方向に基づく逆再生が必要
- **Sources Consulted**:
  - [MDN: Web audio playbackRate explained](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/WebAudio_playbackRate_explained)
- **Findings**:
  - 負の`playbackRate`は現在のブラウザでサポートされていない
  - 逆再生は`AudioBuffer`のチャンネルデータを反転させて新しい`AudioBuffer`を作成する方法で実装
  - `Float32Array.prototype.reverse()`でサンプルデータを反転
- **Implications**: 音声ロード時に逆再生用のAudioBufferを事前生成しておく設計が効率的

### Web Audio API: 時間伸縮（タイムストレッチ）

- **Context**: 要件4で線の長さに基づく音声の長さ変換が必要
- **Sources Consulted**:
  - [Time Stretching & Pitch Shifting with the Web Audio API](https://repository.gatech.edu/handle/1853/54587)
- **Findings**:
  - `playbackRate`を変更すると速度とピッチが同時に変わる
  - 本要件では「線の長さで再生時間を決定」かつ「Y座標でピッチを決定」
  - 再生時間変更＝playbackRateを調整、ピッチ変更＝同じくplaybackRateを調整
  - これらは乗算で組み合わせ可能: `finalPlaybackRate = durationRate * pitchRate`
- **Implications**:
  - 線の長さから算出した`durationRate`とY座標から算出した`pitchRate`を乗算
  - 最終的なplaybackRateで再生

### サイン波サンプル音源の生成

- **Context**: 要件1.2でサンプル音源として5秒間のサイン波が必要
- **Sources Consulted**:
  - [MDN: OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
  - [MDN: AudioBuffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer)
- **Findings**:
  - `OscillatorNode`でリアルタイム生成可能だが、`AudioBufferSourceNode`で再生する場合は`AudioBuffer`が必要
  - `AudioContext.createBuffer()`でバッファを作成し、数式でサイン波を書き込む方法が最も確実
  - 440Hz（A4音）の5秒間サイン波を生成: `sin(2 * PI * 440 * t)`
- **Implications**: アプリ起動時にWeb Audio APIでサイン波AudioBufferを生成

### Next.js Static Export

- **Context**: 要件8.5でSSR不使用、要件9でFirebase Hostingデプロイが必要
- **Sources Consulted**:
  - [Firebase Hosting: Integrate Next.js](https://firebase.google.com/docs/hosting/frameworks/nextjs)
  - [Deploy Your Next.js 14 App to Firebase Hosting](https://chankapure.medium.com/deploy-your-next-js-14-app-to-firebase-hosting-80abea2f6a4e)
- **Findings**:
  - `next.config.js`に`output: 'export'`を設定
  - ビルド時に`out`ディレクトリに静的ファイルが生成される
  - Firebase Hostingの`public`ディレクトリを`out`に設定
  - 画像最適化は`unoptimized: true`で無効化（Firebase無料プランで動作）
- **Implications**: 標準的なNext.js設定で対応可能。追加設定は最小限

### MUI + Next.js App Router

- **Context**: 要件9.3でMUIを使用
- **Findings**:
  - MUI v5/v6はNext.js App Routerと互換性あり
  - `@mui/material`と`@emotion/react`、`@emotion/styled`が必要
  - SSRなしの場合、特別な設定は不要
- **Implications**: 標準的なMUIセットアップで対応可能

### Firebase Authentication

- **Context**: 要件8でメール/パスワード認証が必要
- **Sources Consulted**:
  - [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- **Findings**:
  - Firebase SDK v9+（Modular SDK）を使用
  - `signInWithEmailAndPassword`、`createUserWithEmailAndPassword`で認証
  - `onAuthStateChanged`で認証状態を監視
  - クライアントサイドのみで完結（SSR不要）
  - セッション管理はFirebase SDKが自動で処理
- **Implications**: React Context + カスタムフックで認証状態管理を実装

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Component-based SPA | React単一ページ、状態はuseStateで管理 | シンプル、理解しやすい | 複雑化すると状態管理が煩雑 | 本機能の規模に最適 |
| Custom Hooks分離 | ロジックをカスタムフックに分離 | 再利用性、テスト容易性 | オーバーエンジニアリングのリスク | 音声処理ロジックに適用 |

**Selected**: Component-based SPA + Custom Hooks分離
- UIコンポーネントは状態を持つ
- 音声処理ロジックは`useAudioProcessor`カスタムフックに分離
- キャンバス描画ロジックは`useGestureCanvas`カスタムフックに分離

## Design Decisions

### Decision: 音声処理アーキテクチャ

- **Context**: ピッチ変更、逆再生、時間変更を組み合わせた音声再生が必要
- **Alternatives Considered**:
  1. リアルタイム処理（OscillatorNode + BiquadFilter）— 複雑、要件に合わない
  2. AudioBuffer事前処理 + playbackRate — シンプル、要件を満たす
  3. 外部ライブラリ（Tone.js）— 機能過剰
- **Selected Approach**: AudioBuffer事前処理 + playbackRate
  - 音声ロード時に順再生用と逆再生用の2つのAudioBufferを準備
  - 再生時にplaybackRateでピッチと速度を調整
- **Rationale**: Web Audio API標準機能のみで実装可能、追加依存なし
- **Trade-offs**: ピッチと速度が連動するが、要件上問題なし
- **Follow-up**: ブラウザ互換性テスト（Chrome, Firefox, Safari）

### Decision: 線の長さと再生時間の計算式

- **Context**: 要件4で「20px = 元の音声長さ」の比率
- **Selected Approach**:
  - `durationRate = lineLength / 20`
  - 例: 40pxの線 → durationRate = 2 → 2倍の長さで再生
  - playbackRateは逆数: `1 / durationRate`（遅く再生 = 長くなる）
- **Rationale**: 要件の例示（20px=5秒、40px=10秒）と一致

### Decision: ピッチ変化の計算式

- **Context**: Y座標に比例したピッチ変化（0.25〜4倍）
- **Selected Approach**:
  - キャンバス中央を1.0（ピッチ変化なし）
  - 上端で0.25、下端で4.0
  - 対数スケールで変換: `pitchRate = 0.25 ^ ((centerY - y) / centerY)`（上方向）、`pitchRate = 4 ^ ((y - centerY) / centerY)`（下方向）
- **Rationale**: 人間の聴覚は対数スケールで音程を認識するため

## Risks & Mitigations

- **ブラウザ互換性**: Web Audio APIはモダンブラウザで広くサポート。Safari向けに`AudioContext`のプレフィックス対応が必要な場合あり → `window.AudioContext || window.webkitAudioContext`で対応
- **ユーザーインタラクション要求**: ブラウザはオーディオ再生にユーザーインタラクションを要求 → 音声ロード/再生は必ずユーザーアクション後に実行
- **メモリ使用量**: 大きな音声ファイルをAudioBufferとして保持 → ファイルサイズ制限またはストリーミング検討（将来課題）

## References

- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — 全体概要
- [MDN: AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) — 再生ノード
- [Firebase Hosting: Integrate Next.js](https://firebase.google.com/docs/hosting/frameworks/nextjs) — デプロイ手順
- [Next.js: Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports) — 静的出力設定
