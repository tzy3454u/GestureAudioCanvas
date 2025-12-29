# Requirements Document

## Introduction
本ドキュメントは、キャンバス上のジェスチャー操作によって音声を編集・再生するWebアプリケーションの要件を定義する。ユーザーはキャンバスをドラッグして線を描画し、その線の形状（長さ・方向・位置）に基づいて音声の長さ・再生方向・ピッチが変化する。

## Requirements

### Requirement 1: 音声ファイルの選択とロード
**Objective:** As a ユーザー, I want UIから音声ファイルを選択してロードする機能, so that 操作したい音声を自由に選べる

#### Acceptance Criteria
1. The アプリケーション shall 音声ファイルを選択するためのUIを表示する
2. The アプリケーション shall サンプル音源として5秒間のサイン波音源を含む
3. When ユーザーが音声ファイルを選択する, the アプリケーション shall 選択された音声ファイルをロードする
4. While 音声ファイルがロード中, the アプリケーション shall ロード状態を示す表示をする
5. When 音声ファイルのロードが完了する, the アプリケーション shall キャンバス操作を有効化する
6. If 音声ファイルのロードに失敗する, then the アプリケーション shall エラーメッセージを表示する

### Requirement 2: キャンバスの表示
**Objective:** As a ユーザー, I want 描画可能なキャンバスが表示される, so that ジェスチャー入力ができる

#### Acceptance Criteria
1. The アプリケーション shall 画面上にキャンバス領域を表示する
2. The キャンバス shall ドラッグ操作を受け付け可能な状態で表示される
3. While 音声ファイルがロードされていない, the キャンバス shall 操作を受け付けない状態で表示される

### Requirement 3: 軌跡の描画
**Objective:** As a ユーザー, I want キャンバスをドラッグした際に軌跡が一時的に描画される, so that 自分の操作を視覚的に確認できる

#### Acceptance Criteria
1. When ユーザーがキャンバス上でドラッグ操作を開始する, the キャンバス shall ドラッグの始点を記録する
2. While ユーザーがドラッグ操作中, the キャンバス shall マウス/タッチの軌跡を線として描画する
3. When ユーザーがドラッグ操作を終了する, the キャンバス shall ドラッグの終点を記録し軌跡を確定する

### Requirement 4: 線の長さに基づく音声の長さ変換
**Objective:** As a ユーザー, I want 描いた線の長さに応じて音声の再生時間が変化する, so that ジェスチャーの大きさで音の長さを制御できる

#### Acceptance Criteria
1. The アプリケーション shall 始点から終点までの直線距離を線の長さとして算出する
2. When 描画された線の長さが20pxで元音声が5秒の場合, the アプリケーション shall 5秒の音声を再生する
3. When 描画された線の長さが40pxで元音声が5秒の場合, the アプリケーション shall 10秒の音声を再生する
4. The アプリケーション shall 線の長さと音声の長さの比率（20px = 元の音声長さ）を維持して再生時間を算出する

### Requirement 5: 線の方向に基づく再生方向変換
**Objective:** As a ユーザー, I want 線を引いた方向によって音声の再生方向が変わる, so that ジェスチャーで通常再生と逆再生を切り替えられる

#### Acceptance Criteria
1. When 線の始点から終点へのx座標がプラス方向（右向き）, the アプリケーション shall 音声を通常再生（順方向）する
2. When 線の始点から終点へのx座標がマイナス方向（左向き）, the アプリケーション shall 音声を逆再生する

### Requirement 6: 線の位置に基づくピッチ変換
**Objective:** As a ユーザー, I want 線の始点のy座標位置によって音のピッチが変わる, so that ジェスチャーの位置で音の高低を制御できる

#### Acceptance Criteria
1. When 線の始点のy座標がキャンバス中央より上（y座標が小さい）, the アプリケーション shall 音のピッチを下げて再生する
2. When 線の始点のy座標がキャンバス中央より下（y座標が大きい）, the アプリケーション shall 音のピッチを上げて再生する
3. The アプリケーション shall 始点のy座標とキャンバス中央との距離に比例してピッチの変化量を決定する
4. The アプリケーション shall ピッチ変化の範囲を0.25倍（2オクターブ下）から4倍（2オクターブ上）に制限する

### Requirement 7: 音声再生とキャンバスのリセット
**Objective:** As a ユーザー, I want 編集された音声が再生された後にキャンバスがクリアされる, so that 続けて新しいジェスチャーを入力できる

#### Acceptance Criteria
1. When ドラッグ操作が終了する, the アプリケーション shall 線の形状に基づいて編集された音声を再生する
2. When 音声の再生が完了する, the キャンバス shall 描画された線をクリアする
3. When キャンバスがクリアされる, the アプリケーション shall 新しいドラッグ操作を受け付け可能な状態に遷移する
4. While 音声が再生中, the キャンバス shall 新しいドラッグ操作を受け付けない

### Requirement 8: 認証
**Objective:** As a ユーザー, I want メールアドレスとパスワードでログインする, so that アプリケーションを利用できる

#### Acceptance Criteria
1. The アプリケーション shall Firebase Authenticationを使用してユーザー認証を行う
2. The アプリケーション shall メールアドレスとパスワードによる認証方式を提供する
3. The アプリケーション shall ログイン画面を表示する
4. While ユーザーがログインしていない, the アプリケーション shall キャンバス画面へのアクセスを禁止する
5. When ユーザーがログインに成功する, the アプリケーション shall キャンバス画面へリダイレクトする
6. The アプリケーション shall ログアウト機能を提供する
7. If ログインに失敗する, then the アプリケーション shall エラーメッセージを表示する

### Requirement 9: 技術スタック
**Objective:** As a 開発者, I want 汎用的で保守性の高い技術スタックを使用する, so that 開発効率と拡張性を確保できる

#### Acceptance Criteria
1. The アプリケーション shall React をUIフレームワークとして使用する
2. The アプリケーション shall Next.js をフレームワークとして使用する
3. The アプリケーション shall MUI（Material-UI）をデザインシステムとして使用する
4. The アプリケーション shall TypeScript を使用して型安全性を確保する
5. The アプリケーション shall SSR（サーバーサイドレンダリング）を使用せず、静的エクスポート（Static Export）で構成する
6. The アプリケーション shall Firebase SDKを使用してFirebaseサービスと連携する

### Requirement 10: デプロイ
**Objective:** As a 開発者, I want アプリケーションをFirebase Hostingにデプロイする, so that ユーザーがWebブラウザからアクセスできる

#### Acceptance Criteria
1. The アプリケーション shall Firebase Hostingにデプロイ可能な静的ファイル構成である
2. The アプリケーション shall HTTPS経由でアクセス可能である
3. The アプリケーション shall 単一ページアプリケーション（SPA）として動作する
