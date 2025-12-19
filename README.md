# CWLLM

フロントエンドとバックエンドを分離した構成です。

## 構成
- `backend/`: Express + SQLite（APIサーバ）
- `frontend/`: Vite + React（UI）

## セットアップ
```bash
cd backend
cp .env.example .env
npm install

cd ../frontend
npm install
```

## 開発
2つのサーバを同時に起動します（別ターミナルでもOK）。
```bash
npm run dev
```

- UI: `http://localhost:5173`
- API: `http://localhost:3000`

## Seed / Smoke
```bash
npm run db:seed
npm run smoke
```

## 本番相当（静的配信）
バックエンドは `frontend/dist` を配信します。
```bash
npm run build
npm run start
```

