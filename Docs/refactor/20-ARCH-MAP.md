# アーキテクチャ概要

## 入口
- backend/src/index.ts: Fastify API のエントリ。JWT/Cookie/認証/RateLimit/Swagger など。
- backend/src/worker.ts: BullMQ ワーカーのエントリ。ジョブ処理を担当。
- frontend/src/main.tsx: React エントリ。Router + AuthProvider。

## 主要機能
1) 認証/認可
   - Frontend: AuthProvider + ProtectedRoute, /login
   - Backend: /api/auth
   - 主要: DBユーザー, JWT発行
   - 注意: token cookie と Authorization の両対応

2) 企業/案件/タスク CRUD
   - Backend: /api/companies, /api/projects, /api/tasks, /api/wholesales
   - DB: Company, Project, Task, Wholesale, Contact
   - 注意: 企業IDパラメータ/ status enum のバリデーション

3) Chatwork 連携
   - Backend: /api/chatwork, /api/messages, /api/jobs
   - Services: chatworkSync.ts, jobQueue.ts
   - 外部: Chatwork API
   - 主要: chatwork_rooms/messages テーブル、job status 管理
   - 注意: (roomId, messageId) の重複防止と lastMessageId 更新

4) 要約生成/LLM
   - Backend: /api/summaries, /api/jobs
   - Services: summaryGenerator.ts, llm.ts
   - 外部: OpenAI API もしくは mock
   - 主要: summaryDraft upsert、token usage 管理
   - 注意: prompt version 記録/テンプレ管理

5) CSV エクスポート
   - Backend: /api/export/companies.csv, /api/export/tasks.csv
   - 主要: CSV ヘッダー/BOM/CSVエスケープ
   - 注意: 大量データ時のストリーム出力

## 主要依存
- PostgreSQL/Prisma
- Redis/BullMQ
- Chatwork API
- OpenAI API
- HTTP Cookie/JWT 認証
- CSV 出力
