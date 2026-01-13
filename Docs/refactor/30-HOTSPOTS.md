# 変更頻度の高い箇所

## バックエンドの巨大ルート
- backend/src/routes/companies.ts (約715行)
- backend/src/routes/tasks.ts (約592行)
- backend/src/routes/messages.ts (約576行)
- backend/src/routes/projects.ts (約548行)
- backend/src/routes/wholesales.ts (約321行)

## フロントエンドの巨大ページ
- frontend/src/pages/CompanyDetail.tsx (約1529行)
- frontend/src/pages/Tasks.tsx (約744行)
- frontend/src/pages/Companies.tsx (約673行)
- frontend/src/pages/ProjectDetail.tsx (約714行)
- frontend/src/pages/Projects.tsx (約526行)

## 参照が多い共通処理
- frontend/src/hooks/useApi.ts (約238行, `rg -l "useApi" frontend/src` で17件参照)
- backend/src/services/jobQueue.ts (約222行)
- backend/src/services/llm.ts (約217行)

## その他注意点
- parseDate が audit-logs/export/messages/projects/summaries/tasks/wholesales に散在 (`rg -n "parseDate" backend/src/routes`).
- Prisma の where 条件が各 route に散在。
