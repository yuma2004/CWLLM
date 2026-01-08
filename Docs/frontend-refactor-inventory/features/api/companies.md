# Companies 機能（企業管理・API中心）

## 対象ページ
- /companies (Companies)
- /companies/:id (CompanyDetail)

## UIコンポーネント一覧（参考）
- components/ui/Badge.tsx
- components/ui/ConfirmDialog.tsx
- components/ui/ErrorAlert.tsx
- components/ui/FilterBadge.tsx
- components/ui/FormInput.tsx
- components/ui/FormSelect.tsx
- components/ui/FormTextarea.tsx
- components/ui/LoadingState.tsx
- components/ui/Pagination.tsx
- components/ui/Skeleton.tsx
- components/ui/StatusBadge.tsx
- components/ui/Tabs.tsx
- components/ui/Toast.tsx

## API
### Companies
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/companies?{q,category,status,tag,ownerId,page,pageSize} | GET | Companies |
| /api/companies | POST | Companies |
| /api/companies/options | GET | Companies, CompanyDetail |
| /api/companies/:id | GET | CompanyDetail, CompanySearchSelect |
| /api/companies/:id | PATCH | CompanyDetail |
| /api/companies/search?q=... | GET | CompanySearchSelect |

### Contacts
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/companies/:id/contacts | GET | CompanyDetail |
| /api/companies/:id/contacts | POST | CompanyDetail |
| /api/companies/:id/contacts/reorder | PATCH | CompanyDetail |
| /api/contacts/:id | PATCH | CompanyDetail |
| /api/contacts/:id | DELETE | CompanyDetail |

### Chatwork rooms
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/chatwork/rooms | GET | Companies, CompanyDetail |
| /api/companies/:id/chatwork-rooms | GET | CompanyDetail |
| /api/companies/:id/chatwork-rooms | POST | Companies, CompanyDetail |
| /api/companies/:id/chatwork-rooms | DELETE | CompanyDetail |

### Messages
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/companies/:id/messages?{page,pageSize,from,to,label,q,companyId} | GET | CompanyDetail |
| /api/messages/search?{q,companyId,page,pageSize,from,to,label} | GET | CompanyDetail |
| /api/messages/labels?limit=20 | GET | CompanyDetail |
| /api/messages | POST | CompanyDetail |
| /api/messages | DELETE | CompanyDetail |

### Company tasks
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/companies/:id/tasks?{page,pageSize,status} | GET | CompanyTasksSection |
| /api/tasks | POST | CompanyTasksSection |
| /api/tasks/:id | PATCH | CompanyTasksSection |
