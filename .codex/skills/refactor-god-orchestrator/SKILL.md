---
name: refactor-god-orchestrator
description: AUTOでリポジトリ分析→計画→衝突しないTODO（タスクパケット）生成→並列実行準備まで行う司令塔。
metadata:
  short-description: 分析・計画・TODO生成・並列準備（AUTO）
---

# 目的
vibecodingで肥大化したプロジェクトを「挙動を変えずに」減量するために、
(1) 分析、(2) 実行計画、(3) タスクパケット（TODO）生成、(4) 並列実行の準備（レーン/ロック/必要ならworktree）を AUTO で行う。

# 絶対条件（Hard）
- 挙動を変えない。仕様変更・ロジック改善・最適化・例外文言変更・API変更は禁止。
- 新規依存追加は禁止（必要なら提案して停止）。
- 生成物（dist/build/.next/coverage/vendor 等）を編集しない。
- チャットに長い前置きや巨大な計画を出さない。成果物はファイルに書く。

# 成果物（生成/更新するパス）
- docs/refactor/
  - 00-CONTRACT.md
  - 10-STACK.md
  - 20-ARCH-MAP.md
  - 30-HOTSPOTS.md
  - 40-PLAN.md
  - 50-RUNBOOK.md
  - tasks/ RF-###.md（タスクパケット）
  - log/ RF-###.md（実行ログ）
- .codex/refactor/
  - state.json（推定コマンド、ベースブランチ、レーン定義、worktree/ブランチ情報）
  - locks/
  - status/（各タスクの実行結果JSON）

# 実行プロトコル（必ずこの順）
## STEP 0: 初期化
- Gitルートを特定し、上記ディレクトリを作成する。
- 既存の docs/refactor/ があれば尊重し、上書きは最小限にする。
- docs/refactor/00-CONTRACT.md を生成（Hardルールを明文化）。

## STEP 1: スタックと検証コマンドをAUTO推定
- package.json / pyproject / go.mod / Cargo.toml / pom.xml / Makefile / CI定義 などから、
  install/build/lint/typecheck/test の候補を優先順位付きで決定し、docs/refactor/10-STACK.md に記録。
- ベースブランチ（main/master/develop等）をAUTO推定し state.json に記録。

## STEP 2: ベースライン健全性チェック（短く）
- 可能なら「最短の安全確認」を実行（例：unit test or typecheck）。
- ここでベースラインが赤なら、勝手に修復しない。
  - P0タスクとして「ベースライン修復」パケットを作り、他タスクをBLOCKEDにしてRUNBOOKへ明記。

## STEP 3: アーキ地図化（推測禁止）
- docs/refactor/20-ARCH-MAP.md を作る：
  - 入口（Web/CLI/Job）と主要フロー3〜5本
  - 副作用（DB/外部API/ファイルIO）位置
  - 変えてはいけない不変条件（invariants）をフローごとに短く

## STEP 4: ホットスポット抽出（証拠ベース）
- docs/refactor/30-HOTSPOTS.md を作る：
  - 巨大ファイル、重複の塊、神モジュール、循環依存疑い、未使用疑い
  - 根拠（行数、参照数、類似検索など）を必ず併記

## STEP 5: レーン設計（衝突ゼロ最優先）
- レーンは A/B/C と SOLO を持つ。
- 分割ルール（AUTO）：
  - packages/apps/services のトップレベル境界で分割（あれば）
  - なければ src/ 配下の feature/module 単位で分割
  - shared/utils/types/common 等の共通基盤は原則 SOLO に寄せる
- state.json にレーン→スコープを保存する。

## STEP 6: タスクパケット生成（RF-###）
- タスクは “小さく・局所・検証可能” を絶対条件にする。
- 1タスク=1スコープ（ディレクトリ/ファイル）で、diff上限を明記。
- docs/refactor/tasks/RF-###.md を複数生成し、各タスクに以下を必ず含める：

### RFタスク必須テンプレ（各タスク内）
- Title / Lane / Scope / Forbidden
- Diff budget（files/lines）
- Preconditions（先に必要なタスク）
- Steps（5〜12手順）
- Acceptance Criteria（挙動同一を含む）
- Verification（実行コマンド）
- Risk（Low/Med/High）と理由
- Rollback（git revert前提）

## STEP 7: 並列実行準備（worktree/ブランチ）
- 可能なら以下を用意：
  - ブランチ：refactor/lane-A, refactor/lane-B, refactor/lane-C, refactor/solo, refactor/integration
  - worktree：.worktrees/lane-A 等（運用に応じて）
- できない場合、RUNBOOKに “コピペで実行できるコマンド” を出す。

## STEP 8: RUNBOOK生成（あなたが最短で回せる手順書）
- docs/refactor/50-RUNBOOK.md を生成：
  - SOLOのP0/P1 → A/B/C並列 → integration → AI review → 人間最終確認
  - 各端末で叩くコマンドをコピペで提示
  - 失敗時の分岐（テスト無し、ベースライン赤、衝突）も書く

# チャット出力（最小）
- 生成した主要ファイル一覧
- 次に叩くべきコマンド（RUNBOOK）
- ブロッカーがあればそれだけ
