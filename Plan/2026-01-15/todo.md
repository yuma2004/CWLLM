# TODO（並列3分割・競合回避）

## 並列1: バックエンド基盤整理
- 対象範囲: backend/src/routes/**, backend/src/services/**, backend/src/utils/**, backend/src/types/**, backend/src/middleware/**, backend/src/test/**
- 目的: ルート/ハンドラ/スキーマ構成の統一、横断ユーティリティの共通化、境界整理
- 作業メモ:
  - routes の分割統一（handlers/schemas を導入・整理）
  - validation/pagination/normalize/ttlCache/errors/prisma の共通化
  - audit/job/chatwork/summary の呼び出し経路を単純化
  - キャッシュキー/TTL を定数化して集約
- テスト: `npm --prefix backend test`
- 触らない範囲: frontend/**, infra/**, scripts/**, Docs/**, README.md

## 並列2: フロントエンド基盤整理
- 対象範囲: frontend/src/lib/**, frontend/src/hooks/**, frontend/src/components/**, frontend/src/pages/**, frontend/src/contexts/**, frontend/src/types/**, frontend/src/utils/**, frontend/src/constants/**, frontend/src/test/**, frontend/e2e/**
- 目的: APIレイヤ/Hook/共通UIの整理、ページ内ロジックの共通化、型定義の整理
- 作業メモ:
  - apiClient/useApi/useApiClient の責務整理
  - 一覧/検索/作成/編集の共通 UI/Hook 化
  - ルート定義と API 参照の整合性確認
  - entities/filters/dashboard などの型整理
- テスト: `npm --prefix frontend test`（必要に応じて `npm --prefix frontend test:e2e`）
- 触らない範囲: backend/**, infra/**, scripts/**, Docs/**, README.md

## 並列3: Docs/Infra/Scripts 整備
- 対象範囲: Docs/**, infra/**, scripts/**, README.md
- 目的: 命名規則/構造/開発手順の明文化、運用スクリプトの整理
- 作業メモ:
  - Docs に構造/命名規則/運用手順を追記
  - infra/scripts の用途と実行手順を README に整理
  - 既存スクリプトの入出力・オプション記述を明文化
- テスト: なし（変更が必要なら該当箇所のみ実行）
- 触らない範囲: backend/**, frontend/**
