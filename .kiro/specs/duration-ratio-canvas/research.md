# Gap Analysis Report: duration-ratio-canvas

## 1. Current State Investigation

### 1.1 Key Files and Modules

| ファイル | 役割 | 変更対象 |
|---------|------|---------|
| [useAudioProcessor.ts](app/hooks/useAudioProcessor.ts) | 音声処理ロジック、`calculateDurationRate`定義 | **Primary** |
| [page.tsx](app/app/main/page.tsx) | メインページ、`calculateDurationRate`呼び出し | Secondary |
| [GestureCanvas.tsx](app/components/GestureCanvas.tsx) | キャンバスコンポーネント、widthプロップ保持 | Unchanged |
| [useGestureCanvas.ts](app/hooks/useGestureCanvas.ts) | ジェスチャー検出ロジック | Unchanged |

### 1.2 Current Implementation

**現在の比率計算ロジック** ([useAudioProcessor.ts:223-225](app/hooks/useAudioProcessor.ts#L223-L225)):
```typescript
const BASE_DISTANCE_PX = 20;  // 固定値

const calculateDurationRate = useCallback((distance: number): number => {
  return distance / BASE_DISTANCE_PX;
}, []);
```

**呼び出し元** ([page.tsx:85](app/app/main/page.tsx#L85)):
```typescript
const durationRate = calculateDurationRate(gesture.distance);
```

**キャンバスサイズ定義** ([page.tsx:14-15](app/app/main/page.tsx#L14-L15)):
```typescript
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
```

### 1.3 Data Flow

```
[GestureCanvas] → gesture.distance → [MainPage] → calculateDurationRate() → durationRate → playAudio()
                                       ↑
                                  CANVAS_WIDTH = 800 (未使用)
```

### 1.4 Existing Tests

- [useAudioProcessor.test.ts:245-264](app/__tests__/hooks/useAudioProcessor.test.ts#L245-L264): `calculateDurationRate`のテスト（固定値20pxベース）
- [audio-processing-flow.test.ts:239-254](app/__tests__/integration/audio-processing-flow.test.ts#L239-L254): 統合テストでの固定値テスト
- [page.test.tsx:51](app/__tests__/app/main/page.test.tsx#L51): モック定義で`distance / 20`を使用

---

## 2. Requirements Feasibility Analysis

### 2.1 Technical Needs (From Requirements)

| 要件 | 技術的ニーズ | 現状 |
|-----|-------------|------|
| Req 1.1: キャンバス幅の半分を基準距離に | 基準距離の動的計算 | ❌ 固定値20px |
| Req 1.2-1.5: 線形比率の維持 | 比率計算ロジック | ✅ 既存ロジック流用可能 |
| Req 2.1: キャンバス幅の動的取得 | widthパラメータ伝達 | ⚠️ 要対応 |
| Req 2.2: 動的参照 | 関数パラメータ化 or コンテキスト | ⚠️ 要対応 |
| Req 3.1: 後方互換性 | シグネチャ維持 or 拡張 | ⚠️ 設計次第 |

### 2.2 Gaps and Constraints

#### Missing Capabilities
1. **キャンバス幅の伝達経路がない**: 現在`calculateDurationRate`は引数として`distance`のみ受け取り、`canvasWidth`を知る方法がない
2. **フック初期化時にキャンバスサイズ不明**: `useAudioProcessor`はコンポーネントマウント前に呼び出される

#### Constraints
1. **既存API互換性**: `calculateDurationRate(distance: number): number`のシグネチャを変更すると、呼び出し元すべてに影響
2. **テストへの影響**: 既存テストは固定値20pxを前提としている

---

## 3. Implementation Approach Options

### Option A: 関数シグネチャ拡張（引数追加）

**変更内容**:
- `calculateDurationRate(distance: number, canvasWidth: number): number`に拡張
- 呼び出し元でCANVAS_WIDTHを渡す

**変更ファイル**:
- `useAudioProcessor.ts`: 関数シグネチャ変更
- `page.tsx`: 呼び出し時にCANVAS_WIDTH追加
- テストファイル3件: 引数追加

**Trade-offs**:
- ✅ 明示的で理解しやすい
- ✅ 純粋関数として維持（テスト容易）
- ✅ 最小限の変更範囲
- ❌ 呼び出し元すべてに変更必要
- ❌ オプショナルパラメータにすると後方互換性維持可能だがデフォルト値の扱いが複雑

### Option B: フック初期化時にパラメータ注入

**変更内容**:
- `useAudioProcessor({ canvasWidth: number })`のようにフック引数を追加
- 内部でclosureとしてcanvasWidthを保持

**変更ファイル**:
- `useAudioProcessor.ts`: フック引数追加、内部参照
- `page.tsx`: フック呼び出し時にcanvasWidth渡す

**Trade-offs**:
- ✅ calculateDurationRateのシグネチャ変更不要
- ✅ 呼び出し元の変更が最小限
- ❌ フックの依存関係が増加
- ❌ テスト時のモック設定が複雑化

### Option C: ハイブリッドアプローチ（オプショナル引数）

**変更内容**:
- `calculateDurationRate(distance: number, canvasWidth?: number): number`
- canvasWidth未指定時は従来の20pxをデフォルトとして使用

**変更ファイル**:
- `useAudioProcessor.ts`: オプショナル引数追加、デフォルト値設定
- `page.tsx`: CANVAS_WIDTHを渡すよう変更
- テストファイル: 新規テストケース追加（既存テストは変更不要）

**Trade-offs**:
- ✅ 完全な後方互換性維持
- ✅ 既存テストそのまま動作
- ✅ 段階的移行が可能
- ❌ デフォルト値（20px）の存在が混乱を招く可能性
- ❌ 将来的にデフォルト値を削除する場合に破壊的変更

---

## 4. Implementation Complexity & Risk

### Effort: **S (1-3 days)**
- 既存パターンの軽微な拡張
- 新規コンポーネント不要
- テスト修正は明確

### Risk: **Low**
- 既知の技術のみ使用
- 変更範囲が限定的
- ロールバック容易

---

## 5. Recommendations for Design Phase

### Preferred Approach: **Option A（関数シグネチャ拡張）**

**理由**:
1. 明示的なAPIで意図が明確
2. 純粋関数として維持されテスト容易
3. 変更範囲が限定的で予測可能
4. オプショナル引数の複雑さを回避

### Key Design Decisions
1. **BASE_DISTANCE_PXの扱い**: 定数として残すか完全削除するか
2. **テスト戦略**: 既存テストの修正 vs 新規テストケース追加

### Research Items
- なし（すべて既存技術で対応可能）
