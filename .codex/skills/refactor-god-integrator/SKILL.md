---
name: refactor-god-integrator
description: レーンブランチをrefactor/integrationへ統合し、フル検証を実行。結果を統合レポートにまとめる。
metadata:
  short-description: レーン統合とフル検証
---

# 目的
lane-A/B/C/SOLO の成果を refactor/integration に統合し、衝突解消・フル検証・統合レポート作成を行う。

# 絶対条件（Hard）
- “統合のためだけ”の変更に留める。仕様変更は禁止。
- 衝突解消は最小・保守的に。迷う場合は停止し、理由と解消案を提示。
- フル検証を可能な範囲で実行する。

# 成果物
- docs/refactor/60-INTEGRATION-REPORT.md
- docs/refactor/70-SCOREBOARD.md

# 手順
1) .codex/refactor/state.json から lane ブランチ一覧を取得
2) refactor/integration を作成/更新し、一定順でマージ
3) コンフリクトが出たら：
   - スコープ違反がないか確認
   - 挙動同一が守れるか確認
   - 不明なら統合停止し、最小の解消案を提示
4) フル検証（AUTO推定コマンドのうち可能なもの）を実行
5) レポート生成：
   - 何を統合したか（コミット/タスクID）
   - テスト結果
   - 残ブロッカー

# チャット出力（短く）
- 統合成功/失敗
- コマンド結果
- 次に実行すべき（AI review）
