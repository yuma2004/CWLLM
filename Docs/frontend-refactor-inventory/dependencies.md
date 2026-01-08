# 依存関係とエントリポイント

## 対象範囲
- 対象: frontend/src のみ
- 除外: frontend/src/**/*.test.*, frontend/dist, frontend/node_modules

## 実行時依存関係
| パッケージ | 備考 | 使用箇所 |
| --- | --- | --- |
| react | UIランタイム | main.tsx, pages, components |
| react-dom | React DOM | main.tsx |
| react-router-dom | ルーティング | main.tsx, App.tsx, pages |
| @dnd-kit/core | ドラッグ&ドロップ | components/KanbanBoard.tsx, components/KanbanColumn.tsx, components/KanbanCard.tsx |
| @dnd-kit/utilities | DnDユーティリティ | components/KanbanCard.tsx |

## 開発時依存関係
| パッケージ | 備考 |
| --- | --- |
| vite, @vitejs/plugin-react | ビルド/開発サーバ |
| typescript | 型チェック |
| tailwindcss, postcss, autoprefixer | スタイリング |
| eslint, eslint-plugin-* | Lint |
| prettier | フォーマット |
| vitest, @testing-library/*, jsdom | 単体テスト |
| @playwright/test | E2Eテスト |

## エントリポイントと認証
- frontend/src/main.tsx: ReactDOM root, BrowserRouter
- frontend/src/App.tsx: AuthProvider, ルート設定
- frontend/src/contexts/AuthContext.tsx: 認証状態/ログイン/ログアウト、auth_token の保存
- frontend/src/components/ProtectedRoute.tsx: 認可ガード
- frontend/src/components/Layout.tsx: サイドバー/ナビゲーション/ロールによる表示切替
