# Tasks 機能（タスク管理・画面中心）

## 対象ページ
- /tasks (Tasks)
- /tasks/:id (TaskDetail)

## 画面の責務
- Tasks: 一覧、検索/絞り込み、バルク更新、カンバン表示
- TaskDetail: 詳細の閲覧/編集/削除

## UIコンポーネント一覧
| UIコンポーネント | 主な使用箇所 |
| --- | --- |
| components/ui/ConfirmDialog.tsx | Tasks, TaskDetail |
| components/ui/ErrorAlert.tsx | Tasks, TaskDetail |
| components/ui/EmptyState.tsx | Tasks |
| components/ui/FilterBadge.tsx | Tasks |
| components/ui/FormInput.tsx | Tasks, TaskDetail |
| components/ui/FormSelect.tsx | Tasks, TaskDetail |
| components/ui/FormTextarea.tsx | TaskDetail |
| components/ui/Pagination.tsx | Tasks |
| components/ui/Skeleton.tsx | Tasks |
| components/ui/StatusBadge.tsx | Tasks, TaskDetail |

## 関連コンポーネント
- components/KanbanBoard.tsx
- components/KanbanColumn.tsx
- components/KanbanCard.tsx
- components/CompanyTasksSection.tsx (企業詳細内のタスク)
- WholesaleDetail: /api/wholesales/:id/tasks で関連タスク表示

## 主要Hooks/Utils
- useApi, usePermissions, useKeyboardShortcut, useUrlSync
- statusLabel, targetTypeLabel, TASK_STATUS_OPTIONS, TARGET_TYPE_OPTIONS
- formatDate, formatDateInput, getTargetPath

## API
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/tasks?{status,targetType,dueFrom,dueTo,assigneeId,page,pageSize} | GET | Tasks |
| /api/me/tasks?{status,targetType,dueFrom,dueTo,assigneeId,page,pageSize} | GET | Tasks |
| /api/tasks/:id | GET | TaskDetail |
| /api/tasks | POST | CompanyTasksSection |
| /api/tasks/:id | PATCH | Tasks, TaskDetail, CompanyTasksSection |
| /api/tasks/bulk | PATCH | Tasks |
| /api/tasks/:id | DELETE | Tasks, TaskDetail |
| /api/users/options | GET | Tasks, TaskDetail |
| /api/wholesales/:id/tasks?{page,pageSize} | GET | WholesaleDetail |
