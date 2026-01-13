# ルート一覧

ラベルは frontend/src/constants/routes.tsx から抜粋。

| パス | ページ | ラベル | セクション | 認証 | ロール |
| --- | --- | --- | --- | --- | --- |
| /login | Login | なし | public | public | - |
| / | Home | ダッシュボード | main | protected | - |
| /companies | Companies | 企業管理 | main | protected | - |
| /companies/:id | CompanyDetail | なし | - | protected | - |
| /tasks | Tasks | タスク管理 | main | protected | - |
| /tasks/:id | TaskDetail | なし | - | protected | - |
| /projects | Projects | 案件管理 | main | protected | - |
| /projects/:id | ProjectDetail | なし | - | protected | - |
| /wholesales | Wholesales | 卸管理 | main | protected | - |
| /wholesales/:id | WholesaleDetail | なし | - | protected | - |
| /settings | Settings | 設定 | settings | protected | admin |
| /exports | Exports | エクスポート | settings | protected | admin |
| /settings/chatwork | ChatworkSettings | Chatwork設定 | settings | protected | admin |
