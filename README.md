# Chatwork連携 企業/案件/対応管理システム

Chatworkの会話を企業単位で統合し、企業/案件/卸/タスク/要約（AI）を一元管理するシステムです。

## プロジェクト構成

```
/
  frontend/              # UI（React + TypeScript + Vite）
  backend/               # API・バッチ（Node.js + TypeScript + Fastify）
  infra/                 # docker compose / DB等
  Docs/                  # ドキュメント
```

## セットアップ

### 前提条件

- Node.js 18以上
- Docker & Docker Compose
- PostgreSQL（Docker経由で起動）

### 起動手順

1. **環境変数の設定**

```bash
cp env.example .env
2. **データベースの起動**

```bash
cd infra
docker compose up -d
```

Dockerで起動する場合は `RUN_MIGRATIONS=true` を指定すると起動時にマイグレーションが実行されます。

4. **フロントエンドのセットアップと起動**

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

## 開発



# フロントエンド
cd frontend
npm test
```


### シード実行

起動時の自動シードは無効です。必要な場合のみ実行してください。

```bash
cd backend
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your-strong-password npm run seed
```

Dockerの場合は `RUN_SEED=true` を指定すると起動時にシードが走ります。

### リント・フォーマット

```bash
# バックエンド
cd backend
npm run lint
npm run format

# フロントエンド
cd frontend
npm run lint
npm run format
```

## ドキュメント

詳細な実装プランは `Docs/実装プラン.md` を参照してください。

### API ドキュメント

バックエンド起動後に `http://localhost:3000/api/docs` でOpenAPIを確認できます。

```
- OAPIˑ̂߁A[gʐMG[Ŏs邱Ƃ
npm test
```

### 繝ｪ繝ｳ繝医�繝輔か繝ｼ繝槭ャ繝

```bash
# 繝舌ャ繧ｯ繧ｨ繝ｳ繝
cd backend
npm run lint
npm run format

# 繝輔Ο繝ｳ繝医お繝ｳ繝
cd frontend
npm run lint
npm run format
```

## 繝峨く繝･繝｡繝ｳ繝

隧ｳ邏ｰ縺ｪ螳溯｣��繝ｩ繝ｳ縺ｯ `Docs/螳溯｣��繝ｩ繝ｳ.md` 繧貞盾辣ｧ縺励※縺上□縺輔＞縲

## Production (Docker)

1. Copy `.env` from `env.example` and set secrets (DATABASE_URL, JWT_SECRET, CHATWORK_API_TOKEN, OPENAI_API_KEY).
2. Build and start containers:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- Backend health check: `http://localhost:3000/healthz`
- Frontend: `http://localhost:8080`

## Backup / Restore (PostgreSQL)

`infra/scripts/` contains PowerShell helpers for PostgreSQL backup/restore.

Prereqs:
- `pg_dump` and `pg_restore` available in PATH
- run from the repo root with `pwsh`

Options:
- `backup.ps1`: `-DatabaseUrl` (default: `DATABASE_URL`), `-OutputPath` (default: `backup_YYYYMMDD_HHmmss.dump`)
- `restore.ps1`: `-DatabaseUrl` (default: `DATABASE_URL`), `-BackupPath` (required)

### Backup

```bash
pg_dump "${DATABASE_URL}" -Fc -f backup.dump
```

PowerShell helper:

```powershell
pwsh infra/scripts/backup.ps1 -DatabaseUrl $env:DATABASE_URL -OutputPath backup.dump
```

### Restore

```bash
pg_restore --clean --if-exists -d "${DATABASE_URL}" backup.dump
```

PowerShell helper:

```powershell
pwsh infra/scripts/restore.ps1 -DatabaseUrl $env:DATABASE_URL -BackupPath backup.dump
```

## E2E（実API）

```bash
cd frontend
npm run test:e2e
```

- `.env` の `CHATWORK_API_TOKEN` / `CHATWORK_API_BASE_URL` を使用
- `DATABASE_URL_TEST`（未設定なら `DATABASE_URL`）で migrate/seed を実行
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` を使ってログイン
- 外部API依存のため、レート制限や通信エラーで失敗することあり
