# Project Structure

## Organization Philosophy

機能ベースのフラット構造。Next.js App Routerの規約に従いつつ、コンポーネントとフックを明確に分離。小規模プロジェクトのため深いネストは避ける。

## Directory Patterns

### Pages (`app/app/`)
**Location**: `app/app/`
**Purpose**: Next.js App Routerのページコンポーネント
**Example**: `app/app/login/page.tsx` → `/login` ルート

### Components (`app/components/`)
**Location**: `app/components/`
**Purpose**: 再利用可能なUIコンポーネント
**Example**: `AuthGuard.tsx`, `GestureCanvas.tsx`

### Hooks (`app/hooks/`)
**Location**: `app/hooks/`
**Purpose**: カスタムフック（ビジネスロジック・状態管理）
**Example**: `useAudioProcessor.ts`, `useGestureCanvas.ts`

### Library (`app/lib/`)
**Location**: `app/lib/`
**Purpose**: ユーティリティ、設定、外部サービス連携
**Example**: `firebase.ts`, `theme.ts`, `ThemeRegistry.tsx`

### Tests (`app/__tests__/`)
**Location**: `app/__tests__/`
**Purpose**: Jest テストファイル
**Example**: `__tests__/app/page.test.tsx`

## Naming Conventions

- **Files**: PascalCase（コンポーネント）、camelCase（フック、ユーティリティ）
- **Components**: PascalCase、ファイル名と一致
- **Functions**: camelCase
- **Hooks**: `use` プレフィックス

## Import Organization

```typescript
// 1. React/Next.js
import { useState, useCallback } from 'react';

// 2. External libraries
import { Box, Container } from '@mui/material';

// 3. Internal modules (path alias)
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
```

**Path Aliases**:
- `@/`: `app/` ディレクトリへのエイリアス

## Code Organization Principles

- **1コンポーネント1ファイル**: 各コンポーネントは独自のファイルに配置
- **フックによるロジック分離**: UIコンポーネントはプレゼンテーションに集中、ロジックはフックに委譲
- **'use client' ディレクティブ**: クライアントコンポーネントは明示的に宣言

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
