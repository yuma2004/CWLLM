# API一覧

## 認証
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/auth/me | GET | AuthContext |
| /api/auth/login | POST | AuthContext |
| /api/auth/logout | POST | AuthContext |

## ダッシュボード
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/dashboard | GET | Home |

## 企業
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/companies?{q,category,status,tag,ownerId,page,pageSize} | GET | Companies |
| /api/companies | POST | Companies |
| /api/companies/options | GET | Companies, CompanyDetail, Exports |
| /api/companies/:id | GET | CompanyDetail, CompanySearchSelect, Wholesales |
| /api/companies/:id | PATCH | CompanyDetail |
| /api/companies/:id/contacts | GET | CompanyDetail |
| /api/companies/:id/contacts | POST | CompanyDetail |
| /api/companies/:id/contacts/reorder | PATCH | CompanyDetail |
| /api/companies/:id/chatwork-rooms | GET | CompanyDetail |
| /api/companies/:id/chatwork-rooms | POST | Companies, CompanyDetail |
| /api/companies/:id/chatwork-rooms | DELETE | CompanyDetail |
| /api/companies/:id/messages?{page,pageSize,from,to,label,q,companyId} | GET | CompanyDetail |
| /api/companies/:id/tasks?{page,pageSize,status} | GET | CompanyTasksSection |
| /api/companies/search?q=... | GET | CompanySearchSelect |

## 連絡先
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/contacts/:id | PATCH | CompanyDetail |
| /api/contacts/:id | DELETE | CompanyDetail |

## メッセージ
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/messages/search?{q,companyId,page,pageSize,from,to,label} | GET | CompanyDetail |
| /api/messages/labels?limit=20 | GET | CompanyDetail |
| /api/messages | POST | CompanyDetail |
| /api/messages | DELETE | CompanyDetail |

## Chatwork
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/chatwork/rooms | GET | ChatworkSettings, Companies, CompanyDetail |
| /api/chatwork/rooms/:id | PATCH | ChatworkSettings |
| /api/chatwork/rooms/sync | POST | ChatworkSettings |
| /api/chatwork/messages/sync | POST | ChatworkSettings |

## タスク
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/tasks?{status,targetType,dueFrom,dueTo,assigneeId,page,pageSize} | GET | Tasks |
| /api/me/tasks?{status,targetType,dueFrom,dueTo,assigneeId,page,pageSize} | GET | Tasks |
| /api/tasks/:id | GET | TaskDetail |
| /api/tasks | POST | CompanyTasksSection |
| /api/tasks/:id | PATCH | Tasks, TaskDetail, CompanyTasksSection |
| /api/tasks/bulk | PATCH | Tasks |
| /api/tasks/:id | DELETE | Tasks, TaskDetail |
| /api/wholesales/:id/tasks?{page,pageSize} | GET | WholesaleDetail |

## ユーザー
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/users | GET | Projects, ProjectDetail |
| /api/users/options | GET | Tasks, TaskDetail, Exports |

## 案件
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/projects?{q,status,companyId,ownerId,page,pageSize} | GET | Projects |
| /api/projects | POST | Projects |
| /api/projects/:id | GET | ProjectDetail, ProjectSearchSelect, Wholesales |
| /api/projects/:id | PATCH | ProjectDetail |
| /api/projects/:id/wholesales | GET | ProjectDetail |
| /api/projects/search?q=... | GET | ProjectSearchSelect |

## 卸
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/wholesales?{status,projectId,companyId,unitPriceMin,unitPriceMax,page,pageSize} | GET | Wholesales |
| /api/wholesales | POST | ProjectDetail |
| /api/wholesales/:id | GET | WholesaleDetail |
| /api/wholesales/:id | PATCH | ProjectDetail, Wholesales, WholesaleDetail |
| /api/wholesales/:id | DELETE | ProjectDetail, Wholesales, WholesaleDetail |

## ジョブ
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/jobs/:id | GET | ChatworkSettings |
| /api/jobs/:id/cancel | POST | ChatworkSettings |

## 設定
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/settings | GET | Settings |
| /api/settings | PATCH | Settings |

## エクスポート
| エンドポイント | Method | 参照元 |
| --- | --- | --- |
| /api/export/companies.csv | GET | Exports (apiDownload) |
| /api/export/tasks.csv | GET | Exports (apiDownload) |
