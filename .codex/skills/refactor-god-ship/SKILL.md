---
name: refactor-god-ship
description: 最終提出用のPR説明文・変更要約・テスト手順・人間レビューのチェックリストを生成する。
metadata:
  short-description: 最終提出パック作成
---

# 目的
あなたが「見るだけで終われる」最終成果物を作る。

# 生成物
- docs/refactor/80-PR-DRAFT.md（What/Why/How to test/Risk/Rollback）
- docs/refactor/90-HUMAN-CHECKLIST.md（重要順最大15項目）
- docs/refactor/99-FINAL-SUMMARY.md（DONE/未完/次の余地）

# ルール
- 文章は短く、レビューに必要な情報だけ。
- “挙動を変えていない”根拠を、テスト結果/差分性質/ルール遵守で説明する。

# チャット出力（短く）
- PR-DRAFTの要点（最大10行）
- チェックリスト上位5項目
