# Implementation Plan

## Tasks

- [x] 1. useResponsiveCanvasフックの作成
- [x] 1.1 ブレイクポイント判定とキャンバスサイズ計算機能の実装
  - MUIのuseMediaQueryとuseThemeを使用してビューポートサイズを監視する
  - モバイル（350x175）、タブレット（550x275）、デスクトップ（800x400）の固定サイズを返却する
  - isMobile、isTablet、isDesktopのboolean判定を提供する
  - SSR環境ではデスクトップサイズをデフォルト値として返却する（noSsr: trueオプション使用）
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. MainPageのレスポンシブ対応
- [x] 2.1 キャンバスサイズの動的適用
  - useResponsiveCanvasフックを導入し、定数CANVAS_WIDTH/HEIGHTを動的値に置換する
  - GestureCanvasコンポーネントに動的なwidth/heightを渡す
  - handleGestureComplete内のピッチ曲線・再生時間計算に動的キャンバスサイズを渡す
  - _Requirements: 1.4_

- [x] 2.2 レイアウトのパディングとギャップ調整
  - Containerのsx propでレスポンシブパディングを設定する（モバイル: 16px、デスクトップ: 32px）
  - 要素間のギャップをレスポンシブ化する（モバイル: 16px、デスクトップ: 32px）
  - _Requirements: 3.1, 3.2_

- [x] 2.3 音量スライダーとAccordionの幅調整
  - 音量スライダーの幅を画面幅の90%（最大300px）に設定する
  - Accordionの幅をキャンバス幅と同期させる
  - _Requirements: 3.4, 3.5_

- [x] 3. Headerコンポーネントのレスポンシブ対応
- [x] 3.1 (P) タイトルとユーザー情報の表示切り替え
  - モバイルでアプリタイトルを短縮表示（「GAC」）にする
  - モバイルでユーザーメールアドレスを非表示にする
  - デスクトップでフルタイトルとメールアドレスを表示する
  - sx propのdisplayプロパティでレスポンシブ切り替えを実装する
  - _Requirements: 2.1, 2.3_

- [x] 3.2 (P) ログアウトボタンのレスポンシブ対応
  - モバイルでアイコンのみ表示のIconButtonに変更する
  - デスクトップでテキスト付きログアウトボタンを表示する
  - タップ領域を最低44x44px確保する
  - _Requirements: 2.2, 2.4, 4.4_

- [x] 4. AudioSelectorコンポーネントのレスポンシブ対応
- [x] 4.1 (P) ボタンレイアウトの切り替え
  - Stackコンポーネントのdirectionをレスポンシブ化する（モバイル: column、デスクトップ: row）
  - ボタンの最小高さを44pxに設定してタップ領域を確保する
  - _Requirements: 3.3, 4.4_

- [x] 5. タッチ操作の最適化
- [x] 5.1 マルチタッチ制御の実装
  - useGestureCanvasフックでマルチタッチを検出し、最初のタッチポイントのみを追跡するようにする
  - 2本目以降のタッチを無視する処理を追加する
  - _Requirements: 4.2_

- [x] 5.2 キャンバス外ドラッグ時の処理改善
  - タッチ操作でキャンバス外にドラッグした場合にジェスチャーを正常に完了させる
  - pointerleaveイベント時にジェスチャーデータを適切に処理する
  - _Requirements: 4.3_

- [x] 6. ビューポートとフォント設定
- [x] 6.1 viewport meta tagの設定確認
  - layout.tsxでNext.js 14のviewport exportを使用してmeta tagを設定する
  - width=device-width、initial-scale=1.0を確認・追加する
  - _Requirements: 5.1_

- [x] 6.2 (P) フォントサイズ設定の確認
  - MUIテーマのtypography設定でrem単位が使用されていることを確認する
  - モバイルで本文フォントサイズが14px以上になることを確認する
  - ユーザーのブラウザフォントサイズ設定が尊重されることを確認する
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 7. 統合テストと動作確認
- [x] 7.1 useResponsiveCanvasフックのユニットテスト
  - 各ブレイクポイントで正しいキャンバスサイズが返却されることをテストする
  - アスペクト比2:1が維持されることをテストする
  - SSR環境でのデフォルト値を確認するテストを追加する
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 7.2 レスポンシブUIの統合テスト
  - モバイル、タブレット、デスクトップの各ビューポートでレイアウトを確認する
  - キャンバスサイズ変更時に音声処理が正しく動作することを確認する
  - ヘッダーとAudioSelectorの表示切り替えを確認する
  - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_
