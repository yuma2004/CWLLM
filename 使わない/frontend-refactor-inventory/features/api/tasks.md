# Tasks 機能（タスク管理・API中心）

## 対象ページ
- /tasks (Tasks)
- /tasks/:id (TaskDetail)

## UIコンポーネント一覧（参考）
- components/ui/ConfirmDialog.tsx
- components/ui/ErrorAlert.tsx
- components/ui/EmptyState.tsx
- components/ui/FilterBadge.tsx
- components/ui/FormInput.tsx
- components/ui/FormSelect.tsx
- components/ui/FormTextarea.tsx
- components/ui/Pagination.tsx
- components/ui/Skeleton.tsx
- components/ui/StatusBadge.tsx

## API
### Tasks
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/tasks?{status,targetType,dueFrom,dueTo,assigneeId,page,pageSize} | GET | Tasks |
| /api/me/tasks?{status,targetType,dueFrom,dueTo,assigneeId,page,pageSize} | GET | Tasks |
| /api/tasks/:id | GET | TaskDetail |
| /api/tasks | POST | CompanyTasksSection |
| /api/tasks/:id | PATCH | Tasks, TaskDetail, CompanyTasksSection |
| /api/tasks/bulk | PATCH | Tasks |
| /api/tasks/:id | DELETE | Tasks, TaskDetail |

### Users
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/users/options | GET | Tasks, TaskDetail |

### Related tasks
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/wholesales/:id/tasks?{page,pageSize} | GET | WholesaleDetail |
