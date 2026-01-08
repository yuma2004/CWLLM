# Companies 機能（企業管理・画面中心）

## 対象ページ
- /companies (Companies)
- /companies/:id (CompanyDetail)

## 画面の責務
- Companies: 一覧、検索/絞り込み、追加フォーム、Chatworkからの選択
- CompanyDetail: 企業詳細、担当者、タグ/カテゴリ/ステータス、タイムライン、Chatworkルーム、タスク

## UIコンポーネント一覧
| UIコンポーネント | 主な使用箇所 |
| --- | --- |
| components/ui/Badge.tsx | CompanyDetail |
| components/ui/ConfirmDialog.tsx | CompanyDetail |
| components/ui/ErrorAlert.tsx | Companies, CompanyDetail, CompanyTasksSection |
| components/ui/FilterBadge.tsx | Companies |
| components/ui/FormInput.tsx | Companies, CompanyTasksSection |
| components/ui/FormSelect.tsx | Companies, CompanyDetail, CompanyTasksSection |
| components/ui/FormTextarea.tsx | Companies, CompanyTasksSection |
| components/ui/LoadingState.tsx | Companies, CompanyTasksSection |
| components/ui/Pagination.tsx | Companies, CompanyDetail |
| components/ui/Skeleton.tsx | Companies, CompanyDetail |
| components/ui/StatusBadge.tsx | Companies, CompanyDetail, CompanyTasksSection |
| components/ui/Tabs.tsx | CompanyDetail |
| components/ui/Toast.tsx | CompanyDetail |

## 関連コンポーネント
- components/CompanyTasksSection.tsx (CompanyDetailで使用)

## 主要Hooks/Utils
- useApi, usePermissions, usePagination, useUrlSync, useDebouncedValue, useKeyboardShortcut, useToast
- formatDateGroup, getAvatarColor, getInitials
- COMPANY_CATEGORY_DEFAULT_OPTIONS, COMPANY_STATUS_DEFAULT_OPTIONS

## API
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/companies?{q,category,status,tag,ownerId,page,pageSize} | GET | Companies |
| /api/companies | POST | Companies |
| /api/companies/options | GET | Companies, CompanyDetail |
| /api/companies/:id | GET | CompanyDetail, CompanySearchSelect |
| /api/companies/:id | PATCH | CompanyDetail |
| /api/companies/:id/contacts | GET | CompanyDetail |
| /api/companies/:id/contacts | POST | CompanyDetail |
| /api/companies/:id/contacts/reorder | PATCH | CompanyDetail |
| /api/contacts/:id | PATCH | CompanyDetail |
| /api/contacts/:id | DELETE | CompanyDetail |
| /api/companies/:id/chatwork-rooms | GET | CompanyDetail |
| /api/companies/:id/chatwork-rooms | POST | Companies, CompanyDetail |
| /api/companies/:id/chatwork-rooms | DELETE | CompanyDetail |
| /api/chatwork/rooms | GET | Companies, CompanyDetail |
| /api/companies/:id/messages?{page,pageSize,from,to,label,q,companyId} | GET | CompanyDetail |
| /api/messages/search?{q,companyId,page,pageSize,from,to,label} | GET | CompanyDetail |
| /api/messages/labels?limit=20 | GET | CompanyDetail |
| /api/messages | POST | CompanyDetail |
| /api/messages | DELETE | CompanyDetail |
| /api/companies/:id/tasks?{page,pageSize,status} | GET | CompanyTasksSection |
| /api/tasks | POST | CompanyTasksSection |
| /api/tasks/:id | PATCH | CompanyTasksSection |
| /api/companies/search?q=... | GET | CompanySearchSelect |
