# コンポーネント一覧

## 機能コンポーネント
| コンポーネント | 役割 | API利用 | 使用箇所 |
| --- | --- | --- | --- |
| components/CompanyTasksSection.tsx | 企業タスク | GET /api/companies/:id/tasks, POST /api/tasks, PATCH /api/tasks/:id | CompanyDetail |
| components/KanbanBoard.tsx | タスクKanban | - | Tasks |
| components/KanbanColumn.tsx | Kanban列 | - | KanbanBoard |
| components/KanbanCard.tsx | Kanbanカード | - | KanbanBoard |
| components/Layout.tsx | サイドバー | - | App |
| components/ProtectedRoute.tsx | 認証ガード | useAuth | App |
| components/SearchSelect.tsx | 検索セレクト | GET searchEndpoint, GET detailEndpoint | Projects, ProjectDetail, Wholesales |

## UIコンポーネント
| コンポーネント | 役割 |
| --- | --- |
| components/ui/Alert.tsx | 汎用アラート |
| components/ui/Badge.tsx | バッジ |
| components/ui/Button.tsx | ボタン |
| components/ui/Card.tsx | カード |
| components/ui/ConfirmDialog.tsx | 確認ダイアログ |
| components/ui/EmptyState.tsx | 空状態 |
| components/ui/ErrorAlert.tsx | エラー表示 |
| components/ui/FilterBadge.tsx | フィルタバッジ |
| components/ui/FormInput.tsx | 入力 |
| components/ui/FormSelect.tsx | セレクト |
| components/ui/FormTextarea.tsx | テキストエリア |
| components/ui/JobProgressCard.tsx | ジョブ進捗 |
| components/ui/LoadingState.tsx | ローディング |
| components/ui/Modal.tsx | モーダル |
| components/ui/Pagination.tsx | ページング |
| components/ui/Skeleton.tsx | スケルトン |
| components/ui/StatusBadge.tsx | ステータス |
| components/ui/SuccessAlert.tsx | 成功表示 |
| components/ui/Tabs.tsx | タブ |
| components/ui/Toast.tsx | トースト |
