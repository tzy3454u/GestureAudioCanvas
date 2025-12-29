# Gesture Audio Canvas

キャンバス上のジェスチャー操作で音声を編集・再生するWebアプリケーション

## 機能

- ドラッグ操作による直感的な音声パラメータ制御
- 線の長さ → 再生時間
- 線の方向 → 再生方向（右:順再生、左:逆再生）
- Y座標位置 → ピッチ（上:低い、下:高い）
- Firebase Authenticationによるメール/パスワード認証

## 技術スタック

- Next.js 14
- React 18
- TypeScript 5
- MUI (Material-UI) v5
- Firebase Authentication
- Firebase Hosting
- Web Audio API

## セットアップ

### 1. 依存関係のインストール

```bash
cd app
npm install
```

### 2. Firebase設定

`.env.local.example` をコピーして `.env.local` を作成し、Firebaseプロジェクトの設定を入力:

```bash
cp .env.local.example .env.local
```

`.env.local` の内容:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Firebase Authenticationの設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Authentication > Sign-in method で「メール/パスワード」を有効化
3. テスト用ユーザーを作成

## 起動方法

### 開発サーバー

```bash
cd app
npm run dev
```

ブラウザで http://localhost:3000 を開く

### ビルド

```bash
cd app
npm run build
```

`out/` ディレクトリに静的ファイルが生成される

## テスト

```bash
cd app

# 全テスト実行
npm test

# カバレッジ付き
npm test -- --coverage

# ウォッチモード
npm run test:watch
```

## デプロイ

### Firebase Hostingへのデプロイ

#### 初回セットアップ

```bash
# Firebase CLIをインストール（未インストールの場合）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# プロジェクトを選択（プロジェクトルートで実行）
firebase use --add
```

#### デプロイ実行

```bash
cd app

# 本番デプロイ
npm run deploy

# プレビューチャンネルへのデプロイ
npm run deploy:preview
```

デプロイ後、表示されるURLでアプリにアクセス可能

## ディレクトリ構成

```
app/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ（リダイレクト）
│   ├── login/             # ログインページ
│   └── main/              # メインアプリケーション
├── components/            # Reactコンポーネント
│   ├── AudioSelector.tsx  # 音声選択UI
│   ├── AuthGuard.tsx      # 認証ガード
│   ├── GestureCanvas.tsx  # ジェスチャーキャンバス
│   └── Header.tsx         # ヘッダー
├── contexts/              # React Context
│   └── AuthContext.tsx    # 認証状態管理
├── hooks/                 # カスタムフック
│   ├── useAuth.ts         # 認証操作
│   ├── useAudioProcessor.ts # 音声処理
│   └── useGestureCanvas.ts  # ジェスチャー処理
├── lib/                   # ユーティリティ
│   ├── firebase.ts        # Firebase初期化
│   └── theme.ts           # MUIテーマ
├── __tests__/             # テストファイル
└── out/                   # ビルド出力（静的ファイル）
```

## 使い方

1. ログイン画面でメールアドレスとパスワードを入力してログイン
2. 「サンプル音源」または「ファイルを選択」で音声をロード
3. キャンバス上でドラッグして音声を操作
   - 右にドラッグ: 順再生
   - 左にドラッグ: 逆再生
   - 長くドラッグ: 再生時間が長くなる
   - 上部でドラッグ: ピッチが低くなる
   - 下部でドラッグ: ピッチが高くなる
4. ドラッグを離すと音声が再生される
5. 再生完了後、再度ドラッグ可能

## ライセンス

MIT
