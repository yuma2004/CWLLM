# 依存関係クラスター地図（詳細）

このディレクトリは、`Docs/AI/feature-dependency-map.md` を依存関係単位で分割し、
クラスターごとに詳細化した地図です。

## クラスター一覧
- [01_auth-users.md](./01_auth-users.md): 認証/ユーザー管理（JWT・RBAC・パスワード）
- [02_companies-contacts.md](./02_companies-contacts.md): 会社/連絡先（検索・オプション含む）
- [03_projects-wholesales.md](./03_projects-wholesales.md): 案件/卸（関連一覧/詳細）
- [04_tasks-targets.md](./04_tasks-targets.md): タスク管理/ターゲット解決/カンバン
- [05_messages-search.md](./05_messages-search.md): メッセージ/ラベル/全文検索/未割当
- [06_chatwork-integration.md](./06_chatwork-integration.md): Chatwork同期・ルーム連携
- [07_summaries-llm.md](./07_summaries-llm.md): サマリー下書き/LLM
- [08_jobs-queue.md](./08_jobs-queue.md): ジョブ基盤（BullMQ/Redis）
- [09_dashboard-export-settings-audit.md](./09_dashboard-export-settings-audit.md): ダッシュボード/CSV/設定/監査ログ

## 共通の土台（全クラスター横断）
- バックエンド: `backend/src/utils/*`, `backend/src/config/env.ts`, `backend/src/middleware/rbac.ts`
- フロントエンド: `frontend/src/lib/apiClient.ts`, `frontend/src/lib/apiRoutes.ts`,
  `frontend/src/hooks/useApi.ts`, `frontend/src/types/*`
