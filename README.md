# CWLLM

Chatworkのやり取りを起点に、企業・案件・卸・タスク・要約を一元管理するためのWebアプリケーションです。  
営業活動の状況を「会話」「タスク」「案件進捗」でつなぎ、抜け漏れのない運用を目指します。

非エンジニア向けの説明は `Docs/非エンジニア向けプロジェクト概要.md` を参照してください。

## 主な機能

- Chatwork連携
  - ルーム/メッセージ同期、Webhook・手動同期
- 企業管理
  - 企業情報、担当者、関連メッセージの管理
- 案件/卸管理
  - 企業に紐づくプロジェクト・卸情報の管理
- タスク管理
  - 一覧・カンバン・担当者/期限/ステータス管理
- AI要約支援
  - 会話履歴をもとに要約ドラフトを作成
- ダッシュボード/検索/フィードバック
  - 状況把握、検索性向上、改善フィードバック収集

## 技術スタック

- Frontend: React + TypeScript + Vite
- Backend: Fastify + TypeScript + Prisma
- Database: PostgreSQL
- Queue: Redis + BullMQ
- Infra: Docker Compose
- Test: Vitest / Playwright

## ディレクトリ構成

```text
.
├─ backend/      # API, worker, Prisma, backend tests
├─ frontend/     # React UI, frontend tests, e2e
├─ infra/        # 開発用 Docker Compose / backup/restore scripts
├─ scripts/      # 開発補助スクリプト
├─ Docs/         # 要件・運用・分析・図表・非エンジニア向け資料
└─ .github/      # CI
```

## セットアップ

### 前提

- Node.js 18+
- Docker / Docker Compose

### 1. 環境変数

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 2. 依存関係インストール

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3. 開発用DB/Redis起動

```bash
npm run dev:db
```

### 4. アプリ起動

```bash
npm run dev
```

`npm run dev` は以下をまとめて起動します。

- `infra/docker-compose.yml`（PostgreSQL/Redis）
- `backend` 開発サーバー
- `frontend` 開発サーバー

### アクセス先

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- API Docs: `http://localhost:3000/api/docs`

## テスト / 品質チェック

### Frontend

```bash
cd frontend
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

### Backend

```bash
cd backend
npm run lint
npm run build
npm run test -- --run
```

注意: backendテストは `DATABASE_URL_TEST` のPostgreSQLに接続します（既定: `localhost:55432`）。Dockerが起動していないとテストは失敗します。

### E2E（Frontend）

```bash
cd frontend
npm run test:e2e
```

## 本番起動（Docker）

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- Backend health check: `http://localhost:3000/healthz`
- Frontend: `http://localhost:8080`

## バックアップ / リストア

`infra/scripts/` にPowerShellスクリプトがあります。

- Backup: `pwsh infra/scripts/backup.ps1 -DatabaseUrl $env:DATABASE_URL -OutputPath backup.dump`
- Restore: `pwsh infra/scripts/restore.ps1 -DatabaseUrl $env:DATABASE_URL -BackupPath backup.dump`

## 補助スクリプト

- `scripts/dev.mjs`
  - DB起動 + backend/frontend同時起動
- `scripts/create-ai-review-zip.ps1`
  - AIレビュー用の共有ZIP作成

## 参考ドキュメント

- `Docs/非エンジニア向けプロジェクト概要.md`
- `Docs/運用ガイド.md`
- `Docs/要件定義書.md`
- `Docs/diagrams/README.md`
- `Docs/analysis/`
