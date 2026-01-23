# クラスター04: タスク管理・ターゲット解決

## 目的/範囲
- タスクCRUD、ステータス更新、バルク更新
- 対象（company/project/wholesale）の名前解決
- カンバンUI（ドラッグ&ドロップ）

## 依存関係
- Prisma（Task, User）
- `services/taskTargets.ts`（company/project/wholesale 解決）
- 監査ログ `services/audit.ts`
- @dnd-kit/*（フロントエンドDnD）

## バックエンド構成
- `backend/src/routes/tasks.ts`
- `backend/src/routes/tasks.handlers.ts`
- `backend/src/routes/tasks.schemas.ts`
- `backend/src/services/taskTargets.ts`
- `backend/src/services/audit.ts`
- `backend/src/utils/pagination.ts`
- `backend/src/utils/validation.ts`
- `backend/src/utils/prisma.ts`

## フロントエンド構成
- `frontend/src/pages/Tasks.tsx`
- `frontend/src/pages/TaskDetail.tsx`
- `frontend/src/components/KanbanBoard.tsx`
- `frontend/src/components/KanbanColumn.tsx`
- `frontend/src/components/KanbanCard.tsx`
- `frontend/src/components/CompanyTasksSection.tsx`
- `frontend/src/hooks/useUrlSync.ts`
- `frontend/src/hooks/usePagination.ts`
- `frontend/src/constants/labels.ts`

## データフロー
- 一覧/フィルタ: `/api/tasks`, `/api/me/tasks`, `/api/companies/:id/tasks`,
  `/api/projects/:id/tasks`, `/api/wholesales/:id/tasks` → `attachTargetInfo`。
- 更新: `PATCH /api/tasks/:id`、`PATCH /api/tasks/bulk`。
- 監査ログ: create/update/delete で `logAudit`。

## 関連テスト
- `backend/src/routes/tasks.test.ts`
- `frontend/src/pages/Tasks.test.tsx`
- `frontend/src/components/KanbanBoard.test.tsx`

## 他クラスターとの接点
- 会社/案件/卸クラスターに target 解決で依存。
- ユーザー options は Auth/Users クラスターから取得。
