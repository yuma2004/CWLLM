---
name: refactor-god-worker
description: レーン内タスクをAUTOで順次実行（1タスク=1コミット）。差分上限・挙動同一・検証・ログ・ステータス更新まで行う。
metadata:
  short-description: レーンを一気に消化（AUTO）
---

# 目的
Orchestratorが作った docs/refactor/tasks/RF-###.md を、指定レーン（またはAUTO推定レーン）で順に消化する。
理想運用：各レーンworktreeで本スキルを DRAIN モードで走らせ、レーンTODOを一気に終える。

# 入力（省略可、基本AUTO）
- LANE: A|B|C|SOLO（省略時は worktree名/パスから推定、無理ならSOLO）
- MODE: DRAIN|ONE（省略時はDRAIN）
- LIMIT_TASKS: 数（省略時はレーンの未完を可能な限り）
- TASK_ID: RF-###（指定がある場合はONE扱い）

# 絶対条件（Hard）
- 挙動を変えない（仕様変更・ロジック改善・最適化・API変更禁止）。
- 新規依存追加禁止。
- Scope外編集禁止。Forbidden絶対禁止。
- 1タスク=差分上限厳守。超えそうなら中断し、分割案をログに残して停止。
- タスク定義（docs/refactor/tasks/RF-###.md）は編集しない。

# 状態管理（衝突回避）
- ロック：.codex/refactor/locks/<TASK_ID>.lock を作ってから着手
- ステータス：.codex/refactor/status/<TASK_ID>.json を更新
- ログ：docs/refactor/log/<TASK_ID>.md を作成

# 実行プロトコル
1) state.json と 00-CONTRACT.md を読んで制約を理解
2) MODEに応じて未完タスクを選定（Preconditions未達はスキップ）
3) ロック取得（存在したらスキップ）
4) 変更前に短い健全性チェック（可能なら）
   - 赤ならBLOCKEDにして次へ（勝手に直さない）
5) タスクSteps通りに実装（優先：ネスト削減→重複排除→命名/短関数）
6) Verification を実行（不可ならコマンドと成功条件をログへ）
7) 1タスク=1コミット（<TASK_ID>: <Title>）
8) log と status を更新し、ロック解除

# チャット出力（短く）
- 完了したTASK_IDとStatus、次に走るTASK_ID（またはレーン完了）
- 重大ブロッカーのみ
