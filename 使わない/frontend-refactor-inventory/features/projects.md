# Projects 機能（案件管理・画面中心）

## 対象ページ
- /projects (Projects)
- /projects/:id (ProjectDetail)

## 画面の責務
- Projects: 一覧、検索/絞り込み、追加フォーム
- ProjectDetail: 案件詳細、卸先一覧、卸の作成/編集/削除

## UIコンポーネント一覧
| UIコンポーネント | 主な使用箇所 |
| --- | --- |
| components/ui/ConfirmDialog.tsx | ProjectDetail |
| components/ui/ErrorAlert.tsx | Projects, ProjectDetail |
| components/ui/EmptyState.tsx | Projects, ProjectDetail |
| components/ui/FilterBadge.tsx | Projects |
| components/ui/FormInput.tsx | Projects, ProjectDetail |
| components/ui/FormSelect.tsx | Projects, ProjectDetail |
| components/ui/FormTextarea.tsx | Projects, ProjectDetail |
| components/ui/LoadingState.tsx | ProjectDetail |
| components/ui/Pagination.tsx | Projects |
| components/ui/Skeleton.tsx | Projects |
| components/ui/StatusBadge.tsx | Projects, ProjectDetail |

## 関連コンポーネント
- components/SearchSelect.tsx (CompanySearchSelect)

## 主要Hooks/Utils
- useApi, usePermissions, useKeyboardShortcut, useDebouncedValue, useUrlSync
- statusLabel, PROJECT_STATUS_OPTIONS
- formatCurrency, formatDate, formatDateInput

## API
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/projects?{q,status,companyId,ownerId,page,pageSize} | GET | Projects |
| /api/projects | POST | Projects |
| /api/projects/:id | GET | ProjectDetail |
| /api/projects/:id | PATCH | ProjectDetail |
| /api/projects/:id/wholesales | GET | ProjectDetail |
| /api/wholesales | POST | ProjectDetail |
| /api/wholesales/:id | PATCH | ProjectDetail |
| /api/wholesales/:id | DELETE | ProjectDetail |
| /api/users | GET | Projects, ProjectDetail |
| /api/companies/search?q=... | GET | CompanySearchSelect |
| /api/companies/:id | GET | CompanySearchSelect |
