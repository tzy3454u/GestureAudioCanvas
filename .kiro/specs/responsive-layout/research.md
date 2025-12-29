# Research & Design Decisions

---
**Purpose**: レスポンシブ対応機能の設計に向けた調査結果と意思決定の記録
---

## Summary
- **Feature**: `responsive-layout`
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - MUI v5のuseMediaQueryとブレイクポイントシステムで全要件を実装可能
  - 既存のuseAudioProcessorは`canvasWidth/Height`をパラメータで受け取っており変更不要
  - GestureCanvasの座標計算は`getBoundingClientRect()`使用で動的サイズに自動対応

## Research Log

### MUIブレイクポイントシステム
- **Context**: レスポンシブ対応にMUI標準機能が使用可能か確認
- **Sources Consulted**:
  - [MUI Breakpoints Documentation](https://mui.com/material-ui/customization/breakpoints/)
  - [MUI useMediaQuery Hook](https://mui.com/material-ui/react-use-media-query/)
- **Findings**:
  - デフォルトブレイクポイント: xs(0px), sm(600px), md(900px), lg(1200px), xl(1536px)
  - `useMediaQuery(theme.breakpoints.up('sm'))`でブレイクポイント判定可能
  - sx propで`{ xs: value, sm: value, md: value }`形式のレスポンシブ値を設定可能
- **Implications**: 要件のブレイクポイント（600px, 900px）はMUIのsm/mdと一致。カスタマイズ不要

### キャンバスリサイズ時の座標変換
- **Context**: キャンバスサイズ変更時にジェスチャー座標計算が正しく動作するか確認
- **Sources Consulted**: 既存コード分析（useGestureCanvas.ts:90-101）
- **Findings**:
  - `getCanvasPoint`は`getBoundingClientRect()`を使用
  - クライアント座標からキャンバス座標への変換はリアルタイムで実行
  - キャンバスサイズが変わっても座標変換ロジックの変更は不要
- **Implications**: useGestureCanvasの変更は不要。GestureCanvasコンポーネントのサイズprops変更のみ

### 音声処理のキャンバスサイズ依存性
- **Context**: ピッチ曲線・再生時間計算がキャンバスサイズに依存しているか確認
- **Sources Consulted**: 既存コード分析（useAudioProcessor.ts:229-270）
- **Findings**:
  - `calculateDurationRate(pathLength, canvasWidth)`: canvasWidthをパラメータで受け取り
  - `generatePitchCurve(path, canvasHeight)`: canvasHeightをパラメータで受け取り
  - デフォルト値（800x600）が定義されているが、呼び出し時に上書き可能
- **Implications**: MainPageから動的なキャンバスサイズを渡すだけで対応可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 既存コンポーネント拡張のみ | MainPage、Header等にsx propブレイクポイントを追加 | 最小限の変更、新規ファイル不要 | MainPageの複雑化、サイズ計算ロジックの再利用困難 | シンプルだが保守性に課題 |
| B: カスタムフック新規作成 | useResponsiveCanvasフックを新規作成 | ロジック分離、テスト容易、再利用可能 | 新規ファイル追加 | 既存パターンに沿った拡張 |
| C: ハイブリッド（採用） | サイズ計算→新規フック、UI→既存拡張 | 関心の分離、既存パターンとの整合性 | 若干の実装工数増 | プロジェクトのカスタムフック分離パターンに最適 |

## Design Decisions

### Decision: ハイブリッドアプローチの採用
- **Context**: レスポンシブ対応をどのように実装するか
- **Alternatives Considered**:
  1. Option A - 既存コンポーネントのみ修正
  2. Option B - 全ロジックを新規フックに抽出
  3. Option C - サイズ計算を新規フック、UIは既存拡張
- **Selected Approach**: Option C（ハイブリッド）
- **Rationale**:
  - プロジェクトの「カスタムフック分離」パターン（steering/tech.md）に準拠
  - useAudioProcessor、useGestureCanvas同様のロジック分離
  - UIコンポーネントは既存パターン（sx prop）で拡張可能
- **Trade-offs**:
  - ✅ テスト容易性と再利用性
  - ✅ 既存アーキテクチャとの整合性
  - ❌ 新規ファイル1つ追加

### Decision: MUIデフォルトブレイクポイントの採用
- **Context**: カスタムブレイクポイントを定義するか、MUIデフォルトを使用するか
- **Alternatives Considered**:
  1. カスタムブレイクポイント（600px, 900px独自定義）
  2. MUIデフォルト（sm:600px, md:900px）
- **Selected Approach**: MUIデフォルト
- **Rationale**: 要件のブレイクポイント（600px, 900px）がMUIのsm/mdと完全一致
- **Trade-offs**:
  - ✅ 追加設定不要
  - ✅ MUIドキュメントとの一貫性
  - ❌ なし

### Decision: useMediaQueryによるサイズ計算
- **Context**: ビューポートサイズの検出方法
- **Alternatives Considered**:
  1. ResizeObserver
  2. window.resize event
  3. useMediaQuery + theme.breakpoints
- **Selected Approach**: useMediaQuery + theme.breakpoints
- **Rationale**:
  - MUI標準機能で追加依存なし
  - ブレイクポイントベースの離散的なサイズ計算に適合
  - SSR対応（noSsrオプション使用可能）
- **Trade-offs**:
  - ✅ MUIエコシステムとの統合
  - ❌ ピクセル単位の連続的なリサイズには不向き（本要件では不要）

### Decision: 固定幅方式の採用
- **Context**: キャンバスサイズの計算方法
- **Alternatives Considered**:
  1. 動的幅方式 - `window.innerWidth`を監視し、割合（95%、90%）で計算
  2. 固定幅方式 - ブレイクポイント毎に固定サイズを定義
- **Selected Approach**: 固定幅方式
- **Rationale**:
  - `useMediaQuery`はブレイクポイントのboolean判定のみを返し、実際のビューポート幅は取得不可
  - 固定幅はシンプルで予測可能、テストが容易
  - SSR環境でも問題なく動作
- **Defined Sizes**:
  - モバイル（600px未満）: 350 x 175px
  - タブレット（600-900px）: 550 x 275px
  - デスクトップ（900px以上）: 800 x 400px
- **Trade-offs**:
  - ✅ シンプルな実装
  - ✅ テスト容易性
  - ✅ SSR対応が容易
  - ❌ 画面幅に完全に適応しない（許容範囲内）

## Risks & Mitigations
- **キャンバスリサイズ時の描画クリア**: リサイズ中にジェスチャー描画中だった場合の挙動 → isPlayingフラグで制御、リサイズ時は描画中断
- **タッチイベントの互換性**: 一部ブラウザでのPointer Events対応 → 既存実装がPointer Eventsを使用しており対応済み
- **パフォーマンス**: 頻繁なリサイズイベント → useMediaQueryはブレイクポイント単位のため問題なし

## References
- [MUI Breakpoints](https://mui.com/material-ui/customization/breakpoints/) - ブレイクポイントのカスタマイズと使用方法
- [MUI useMediaQuery](https://mui.com/material-ui/react-use-media-query/) - メディアクエリフックの使用方法
- [MUI Responsive UI Guide](https://mui.com/material-ui/guides/responsive-ui/) - レスポンシブUI全般のガイド
