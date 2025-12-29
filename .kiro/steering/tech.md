# Technology Stack

## Architecture

クライアントサイド完結のSPA（Single Page Application）。Next.jsの静的エクスポート機能でビルドし、Firebase Hostingでホスティング。サーバーサイド処理は認証のみFirebase Authenticationに委譲。

## Core Technologies

- **Language**: TypeScript（strict mode）
- **Framework**: Next.js 14（App Router）
- **Runtime**: ブラウザ（静的エクスポート、SSRなし）

## Key Libraries

- **UI**: MUI（Material-UI）v5 + Emotion
- **音声処理**: Web Audio API（ブラウザネイティブ）
- **認証**: Firebase Authentication
- **ホスティング**: Firebase Hosting

## Development Standards

### Type Safety
- TypeScript strict mode有効
- 明示的な型定義を推奨

### Code Quality
- ESLint（next/core-web-vitals設定ベース）
- Prettier未導入（検討余地あり）

### Testing
- Jest + React Testing Library
- `__tests__/` ディレクトリにテストを配置

## Development Environment

### Required Tools
- Node.js 20+
- npm

### Common Commands
```bash
# Dev: npm run dev
# Build: npm run build
# Test: npm run test
# Deploy: npm run deploy
```

## Key Technical Decisions

- **静的エクスポート**: SSRを使わず`output: 'export'`でビルド。Firebase Hostingとの相性を優先
- **MUI + Emotion**: Material Designベースの一貫したUI。SSR非対応環境用のEmotionキャッシュ設定あり
- **カスタムフック分離**: 音声処理（`useAudioProcessor`）、ジェスチャー検出（`useGestureCanvas`）、認証（`useAuth`）をカスタムフックに分離

---
_Document standards and patterns, not every dependency_
