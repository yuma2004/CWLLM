# Projects 機能（案件管理・API中心）

## 対象ページ
- /projects (Projects)
- /projects/:id (ProjectDetail)

## UIコンポーネント一覧（参考）
- components/ui/ConfirmDialog.tsx
- components/ui/ErrorAlert.tsx
- components/ui/EmptyState.tsx
- components/ui/FilterBadge.tsx
- components/ui/FormInput.tsx
- components/ui/FormSelect.tsx
- components/ui/FormTextarea.tsx
- components/ui/LoadingState.tsx
- components/ui/Pagination.tsx
- components/ui/Skeleton.tsx
- components/ui/StatusBadge.tsx

## API
### Projects
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/projects?{q,status,companyId,ownerId,page,pageSize} | GET | Projects |
| /api/projects | POST | Projects |
| /api/projects/:id | GET | ProjectDetail |
| /api/projects/:id | PATCH | ProjectDetail |
| /api/projects/:id/wholesales | GET | ProjectDetail |

### Wholesales (from project)
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/wholesales | POST | ProjectDetail |
| /api/wholesales/:id | PATCH | ProjectDetail |
| /api/wholesales/:id | DELETE | ProjectDetail |

### Users and company search
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/users | GET | Projects, ProjectDetail |
| /api/companies/search?q=... | GET | CompanySearchSelect |
| /api/companies/:id | GET | CompanySearchSelect |
