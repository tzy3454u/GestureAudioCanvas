# Implementation Plan

## Tasks

- [x] 1. useGestureCanvasの軌跡データ拡張
- [x] 1.1 (P) 累積距離と総線分長の計算ロジックを追加
  - 軌跡の各セグメント間のユークリッド距離を計算する機能を実装
  - 累積距離配列を生成（始点から各点までの距離を順次累計）
  - 軌跡の総線分長（全セグメント長の合計）を算出
  - 軌跡が2点未満の場合は始点-終点間の直線距離にフォールバック
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.5_
  - _Contracts: GestureData（pathLength, cumulativeDistances）_

- [x] 1.2 GestureDataの拡張フィールドをhandlePointerUpで返却
  - ポインター操作終了時に累積距離配列と総線分長を含むGestureDataを返却
  - 既存のdistance（直線距離）は後方互換性のため維持
  - _Requirements: 2.1, 5.1_
  - _Contracts: GestureCanvasHook.handlePointerUp_

- [x] 2. useAudioProcessorの動的ピッチ機能実装
- [x] 2.1 (P) Y座標からピッチ倍率を計算する関数を実装
  - 画面上端（Y=0）で最大ピッチ5倍、下端（Y=canvasHeight）で最小ピッチ1倍を返す
  - Y座標とピッチの関係を線形に維持
  - ピッチ値を1.0〜5.0の範囲にクランプ
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Contracts: calculatePitchFromY_

- [x] 2.2 (P) 軌跡からピッチ曲線を生成する関数を実装
  - 軌跡の各点のY座標と累積距離に基づいてピッチ配列を生成
  - 累積距離に沿ったサンプリングでFloat32Arrayを作成
  - 長い軌跡は100点程度にダウンサンプリング
  - 上方向への移動でピッチ上昇、下方向でピッチ下降を反映
  - _Requirements: 2.3, 2.4, 2.5, 2.6_
  - _Contracts: generatePitchCurve_

- [x] 2.3 総線分長に基づく再生時間倍率の計算を修正
  - 既存のcalculateDurationRateを総線分長（pathLength）を使用するよう修正
  - キャンバス幅の半分との比率で再生時間倍率を決定
  - ピッチ変更による再生速度変化は許容（補正なし）
  - _Requirements: 3.4, 3.6_
  - _Contracts: calculateDurationRate_

- [x] 2.4 動的ピッチで音声を再生する機能を実装
  - setValueCurveAtTimeを使用してplaybackRateに曲線を設定
  - 再生開始前にピッチ曲線全体を適用
  - Web Audio APIの線形補間により滑らかなピッチ変化を実現
  - _Requirements: 2.2, 2.6, 5.2_
  - _Contracts: playAudioWithDynamicPitch, DynamicPlaybackParams_

- [x] 2.5 静的ピッチ再生（フォールバック）を実装
  - setValueCurveAtTime非対応環境向けの代替処理
  - 軌跡の平均Y座標から単一のピッチ値を算出して適用
  - _Requirements: 5.3_
  - _Contracts: playAudioWithStaticPitch, StaticPlaybackParams_

- [x] 3. 逆再生機能の廃止
- [x] 3.1 逆再生関連のコードを削除
  - isReversePlayback関数を削除
  - reversedBuffer状態を削除
  - reverseAudioBuffer関数を削除
  - X座標方向に関わらず常に順再生するよう処理を統一
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. MainPageの統合処理を更新
- [x] 4.1 ジェスチャー完了時の処理を動的ピッチ対応に変更
  - GestureDataからpathLengthとcumulativeDistancesを取得
  - ピッチ曲線と再生パラメータを生成
  - playAudioWithDynamicPitchを呼び出し
  - 逆再生判定ロジックを削除
  - 軌跡を描いた順序でピッチが変化することを確認
  - _Requirements: 2.2, 4.1, 4.3_

- [x] 5. テストの修正と追加
- [x] 5.1 (P) useGestureCanvasのテストを更新
  - 累積距離計算の正確性を検証
  - 総線分長が直線距離以上であることを検証
  - フォールバック動作（2点未満）を検証
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 5.2 (P) useAudioProcessorのテストを更新
  - Y座標0で5.0倍、canvasHeightで1.0倍、中央で3.0倍を返すことを検証
  - ピッチ曲線生成が正しいFloat32Arrayを返すことを検証
  - 逆再生関連テストを削除
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3_

- [x] 5.3 統合テストの追加
  - ジェスチャー完了から動的ピッチ再生までのフロー検証
  - setValueCurveAtTimeへの正しいパラメータ渡しを検証
  - _Requirements: 2.2, 5.2_

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1.1 | 2.1 |
| 1.2 | 2.1 |
| 1.3 | 2.1 |
| 1.4 | 2.1 |
| 1.5 | 2.1 |
| 1.6 | 2.1 |
| 2.1 | 1.1, 1.2 |
| 2.2 | 2.4, 4.1 |
| 2.3 | 2.2 |
| 2.4 | 2.2 |
| 2.5 | 2.2 |
| 2.6 | 2.2, 2.4 |
| 3.1 | 1.1 |
| 3.2 | 1.1 |
| 3.3 | 1.1 |
| 3.4 | 2.3 |
| 3.5 | 1.1 |
| 3.6 | 2.3 |
| 4.1 | 3.1, 4.1 |
| 4.2 | 3.1 |
| 4.3 | 3.1, 4.1 |
| 5.1 | 1.2 |
| 5.2 | 2.4 |
| 5.3 | 2.5 |
