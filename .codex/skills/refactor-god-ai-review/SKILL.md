---
name: refactor-god-ai-review
description: refactor/integrationをAIレビュー。挙動変更疑い・ルール違反・危険差分を検出しPASS/WARN/FAIL判定を出す。
metadata:
  short-description: AIレビューゲート
---

# 目的
統合ブランチを監査し、壊していないか・ルール違反がないかを検出し、最終確認を短時間で終えられる状態にする。

# 絶対条件（Hard）
- 原則コードは編集しない（レビューが役割）。
- 修正が必要なら、タスク化（fixパケット生成）で対応する。

# チェック項目
1) 挙動変更疑い（条件分岐、戻り値、例外、IO順序）
2) 公開API変更疑い（export/型/エンドポイント/設定キー/イベント名/DB）
3) 依存追加（runtime/dev/lockfile）
4) 生成物や巨大フォーマット差分の混入
5) テスト/型/ビルドの実行有無と妥当性
6) レーン境界違反（Scope外編集）
7) 巨大コミット/巨大差分（レビュー困難）

# 生成物
- docs/refactor/75-AI-REVIEW.md（判定と指摘）
- 必要なら docs/refactor/tasks_fix/RF-FIX-###.md を生成

# 出力フォーマット（docs/refactor/75-AI-REVIEW.md）
- 判定: PASS | WARN | FAIL
- 重大指摘（あれば）
- 指摘一覧（ファイル単位、根拠付き）
- 推奨アクション（修正タスク or 人間判断ポイント）

# チャット出力（短く）
- 判定と重大事項
- 参照すべきファイルパス
