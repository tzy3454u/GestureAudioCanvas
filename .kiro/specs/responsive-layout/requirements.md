# Requirements Document

## Introduction
Gesture Audio Canvasアプリケーションのレスポンシブ対応を行う。現在固定サイズ（800x400px）で実装されているキャンバスや各UIコンポーネントを、モバイル・タブレット・デスクトップなど様々な画面サイズに適応させる。MUIのブレイクポイントシステムを活用し、一貫したユーザー体験を提供する。

## Requirements

### Requirement 1: キャンバスのレスポンシブ対応
**Objective:** ユーザーとして、どのデバイスでもジェスチャーキャンバスを快適に操作したい。画面サイズに応じてキャンバスが適切にリサイズされることで、モバイルでもデスクトップでも同じ体験が得られる。

#### Acceptance Criteria
1. When ビューポート幅が600px未満（モバイル）の場合, the GestureCanvas shall 幅を画面幅の95%に、高さをアスペクト比2:1で自動調整する
2. When ビューポート幅が600px以上900px未満（タブレット）の場合, the GestureCanvas shall 幅を画面幅の90%（最大600px）に設定する
3. When ビューポート幅が900px以上（デスクトップ）の場合, the GestureCanvas shall 幅800px、高さ400pxの固定サイズを維持する
4. When キャンバスサイズが変更された場合, the useAudioProcessor shall 新しいキャンバスサイズに基づいてピッチ曲線と再生時間を正しく計算する
5. The GestureCanvas shall キャンバスのアスペクト比（2:1）を全ての画面サイズで維持する

### Requirement 2: ヘッダーのレスポンシブ対応
**Objective:** ユーザーとして、どの画面サイズでもヘッダーの情報とログアウト機能に快適にアクセスしたい。

#### Acceptance Criteria
1. When ビューポート幅が600px未満の場合, the Header shall アプリタイトルを短縮表示し、ユーザーメールアドレスを非表示にする
2. When ビューポート幅が600px未満の場合, the Header shall ログアウトボタンをアイコンのみの表示に変更する
3. When ビューポート幅が600px以上の場合, the Header shall フルタイトル、メールアドレス、テキスト付きログアウトボタンを表示する
4. The Header shall 全ての画面サイズでタップ/クリック可能な最小サイズ（44x44px）を確保する

### Requirement 3: メインレイアウトのレスポンシブ対応
**Objective:** ユーザーとして、画面サイズに関わらず全てのUI要素（使い方、音声選択、キャンバス、音量スライダー）に快適にアクセスしたい。

#### Acceptance Criteria
1. When ビューポート幅が600px未満の場合, the MainPage shall 縦方向のパディングを16pxに、要素間のギャップを16pxに縮小する
2. When ビューポート幅が600px以上の場合, the MainPage shall 縦方向のパディングを32pxに、要素間のギャップを32pxに設定する
3. The AudioSelector shall 画面幅に応じてボタンのレイアウトを調整する（モバイル: 縦並び、デスクトップ: 横並び）
4. The VolumeSlider shall 幅を画面幅の90%（最大300px）に設定する
5. The Accordion（使い方） shall キャンバスと同じ幅で表示される

### Requirement 4: タッチ操作の最適化
**Objective:** モバイルユーザーとして、タッチ操作でジェスチャーを快適に描画したい。誤操作を防ぎ、意図した通りに線を描ける。

#### Acceptance Criteria
1. The GestureCanvas shall タッチ操作時にブラウザのスクロールやズームを無効化する（touch-action: none）
2. The GestureCanvas shall マルチタッチを無視し、最初のタッチポイントのみを追跡する
3. When タッチ操作でキャンバス外にドラッグした場合, the GestureCanvas shall ジェスチャーを正常に完了させる
4. The UI buttons shall モバイルでのタップ領域を最低44x44pxに確保する

### Requirement 5: ビューポートメタタグとフォントスケーリング
**Objective:** ユーザーとして、モバイルブラウザで適切なスケーリングとフォントサイズでアプリを利用したい。

#### Acceptance Criteria
1. The Application shall viewport meta tagでwidth=device-width, initial-scale=1.0を設定する
2. The Typography shall モバイルで本文フォントサイズを最低14px以上に維持する
3. The Typography shall ヘッダーやボタンのフォントサイズを画面サイズに応じてスケーリングする
4. If ユーザーがブラウザのフォントサイズ設定を変更した場合, the Application shall rem単位によるフォントサイズ調整を尊重する
