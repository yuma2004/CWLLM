# REQUIREMENTS TRACE (CWLLMv)

最終更新: 2026-02-24

## 要件トレーサビリティ表

| 要件ID | 要件 | 実装 (API/DB/UI) | 検証 (テスト) | 監査判定 |
| --- | --- | --- | --- | --- |
| FR-001 | 認証 (login/logout/me) | `backend/src/routes/auth.ts`, `backend/src/routes/auth.handlers.ts`, `frontend/src/pages/Login.tsx`, `frontend/src/contexts/AuthContext.tsx` | `backend/src/routes/auth.test.ts`, `frontend/src/pages/Login.test.tsx`, `frontend/e2e/smoke.spec.ts` | 達成 |
| FR-002 | RBAC | `backend/src/middleware/rbac.ts`, `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/constants/routes.tsx` | `backend/src/middleware/rbac.test.ts`, `frontend/src/components/ProtectedRoute.test.tsx` | 達成 |
| FR-003 | 企業/連絡先管理 | `backend/src/routes/companies.ts`, `backend/prisma/schema.prisma`, `frontend/src/pages/Companies.tsx`, `frontend/src/pages/CompanyDetail.tsx` | `backend/src/routes/companies.test.ts`, `frontend/src/pages/Companies.test.tsx`, `frontend/src/pages/CompanyDetail.test.tsx` | 達成 |
| FR-004 | 案件/卸管理 | `backend/src/routes/projects.ts`, `backend/src/routes/wholesales.ts`, `frontend/src/pages/Projects.tsx`, `frontend/src/pages/ProjectDetail.tsx`, `frontend/src/pages/WholesaleDetail.tsx` | `backend/src/routes/projects.test.ts`, `backend/src/routes/characterization-routes.test.ts`, `frontend/src/pages/ProjectDetail.test.tsx` | 一部達成 |
| FR-005 | タスク管理 | `backend/src/routes/tasks.ts`, `backend/src/services/tasks/**`, `frontend/src/pages/Tasks.tsx`, `frontend/src/pages/TaskDetail.tsx` | `backend/src/routes/tasks.test.ts`, `backend/src/services/tasks/*.test.ts`, `frontend/src/pages/Tasks.test.tsx`, `frontend/src/pages/TaskDetail.test.tsx` | 達成 |
| FR-006 | Chatwork ルーム同期 | `backend/src/routes/chatwork.ts`, `backend/src/services/jobQueue.ts`, `backend/src/services/chatworkSync.ts`, `frontend/src/pages/ChatworkSettings.tsx` | `backend/src/routes/chatwork.test.ts`, `frontend/src/pages/ChatworkSettings.test.tsx`, `frontend/e2e/chatwork-sync.spec.ts` | 達成 |
| FR-007 | Chatwork Webhook/再試行 | `backend/src/routes/chatwork.handlers.ts`, `backend/src/services/chatwork.ts`, `backend/src/config/env.ts` | `backend/src/routes/chatwork.test.ts` | 達成 |
| FR-008 | ダッシュボード | `backend/src/routes/dashboard.ts`, `backend/src/routes/dashboard.handlers.ts`, `frontend/src/pages/Home.tsx` | `backend/src/routes/characterization-routes.test.ts` | 一部達成 |
| FR-009 | フィードバック | `backend/src/routes/feedback.ts`, `backend/src/routes/feedback.handlers.ts`, `frontend/src/pages/Feedback.tsx` | `backend/src/routes/characterization-routes.test.ts`, `frontend/src/pages/Feedback.test.tsx` | 達成 |
| FR-010 | ジョブ管理 | `backend/src/routes/jobs.ts`, `backend/src/services/jobQueue.ts`, `frontend/src/components/ui/JobProgressCard.tsx` | `backend/src/routes/characterization-routes.test.ts` | 一部達成 |
| FR-011 | 要約管理 | `backend/src/routes/summaries.ts`, `backend/src/routes/summaries.handlers.ts`, `frontend/src/components/companies/CompanySummariesTab.tsx` | `backend/src/routes/summaries.test.ts` | 一部達成 |
| FR-012 | 横断検索 | `backend/src/routes/search.ts`, `backend/src/routes/search.handlers.ts` | `backend/src/routes/characterization-routes.test.ts` | 一部達成 |
| NFR-001 | 品質ゲート成立 | `.github/workflows/ci.yml`, `backend/package.json`, `frontend/package.json` | 監査時にローカル実行で確認 | 達成 |
| NFR-002 | 運用安全性 (env/health/shutdown) | `backend/src/config/env.ts`, `backend/src/index.ts` | `backend/src/config/env.test.ts`, `/healthz` 応答確認 | 達成 |

## 監査で確認した主なギャップ

1. `Projects` と `WholesaleDetail` のフロント専用テストが不足（回帰検知が backend/e2e 側に偏る）。
2. `Home` (ダッシュボード) のフロントテストが不足（UI契約の壊れを拾いにくい）。
3. `search`, `jobs`, `wholesales` は characterization テスト依存で、専用 route test が薄い。

