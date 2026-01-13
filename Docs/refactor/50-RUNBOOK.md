# RUNBOOK

## 目的
- 作業前後で backend lint/test と frontend typecheck/test を実行する

## 0. セットアップ
```bash
git fetch origin
git switch main
npm --prefix backend ci
npm --prefix frontend ci
docker compose -f infra/docker-compose.yml up -d
```

## 1. 事前検証 (P0)
```bash
npm --prefix backend run lint
npm --prefix backend run test -- --run
npm --prefix frontend run typecheck
npm --prefix frontend run test -- --run
```
- どれかP0が落ちたら作業中断

## 2. ブランチ作成 (worktree なし)
```bash
git branch refactor/lane-A
git branch refactor/lane-B
git branch refactor/lane-C
git branch refactor/solo
git branch refactor/integration
```

## 2b. worktree 作成
```bash
git worktree add .worktrees/lane-A refactor/lane-A
git worktree add .worktrees/lane-B refactor/lane-B
git worktree add .worktrees/lane-C refactor/lane-C
git worktree add .worktrees/solo refactor/solo
git worktree add .worktrees/integration refactor/integration
```

## 3. SOLO レーン
- RF-006 useApi の整理

## 4. A/B/C レーン
- Lane A: RF-001, RF-002
- Lane B: RF-003, RF-004
- Lane C: RF-005
- 依存関係がないことを確認

## 5. 統合
```bash
git switch refactor/integration
git merge refactor/solo
git merge refactor/lane-A
git merge refactor/lane-B
git merge refactor/lane-C
```
- backend/frontend の lint/typecheck/test 実行
- AI レビュー + 提出物作成

## 注意
- 状態とログを更新する
- 不明点があれば進めずに相談する
