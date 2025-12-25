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
# .envファイルを編集して必要な値を設定
```

`DATABASE_URL_TEST` はテスト用DBの接続先です（`npm test` 実行時に使用）。

2. **データベースの起動**

```bash
cd infra
docker compose up -d
```

3. **バックエンドのセットアップと起動**

```bash
cd backend
npm install
npm run migrate:dev  # 初回のみ（DBマイグレーション）
npm run dev
```

バックエンドは `http://localhost:3000` で起動します。

本番反映時は `npm run migrate:deploy` を利用します。

4. **フロントエンドのセットアップと起動**

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:5173` で起動します。

## 開発

### テスト実行

```bash
# バックエンド
cd backend
npm test

# フロントエンド
cd frontend
npm test
```

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

## Production (Docker)

1. Copy `.env` from `env.example` and set secrets (DATABASE_URL, JWT_SECRET, CHATWORK_API_TOKEN, OPENAI_API_KEY).
2. Build and start containers:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- Backend health check: `http://localhost:3000/healthz`
- Frontend: `http://localhost:8080`

## Backup / Restore (PostgreSQL)

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
