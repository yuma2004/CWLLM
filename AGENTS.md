# AGENTSガイド

## 目的
- このファイルはエージェント向けの作業手引き
- 変更は小さく、既存挙動を維持する

## 作業協定
- 動作を維持する。機能変更、ロジックの「改善」、明示的な要求なしのAPI変更は禁止
- 新しいランタイム依存関係は追加しない。必要な場合は提案して停止
- リポジトリ全体のフォーマットや広範囲のリネーム/移動は避ける
- 差分を小さくレビューしやすく保つ。1タスク＝1コミットを推奨
- テストが存在する場合、変更後に実行する。実行不可なら正確なコマンドを提示
- 変更前にベースラインテストが失敗している場合、リファクタリングの一部として修正しない
- 長い前置きは不要。簡潔にし、成果物（ファイル）を優先する

## リポジトリ構成
- フロントエンド: React + Vite + Tailwind CSS (TypeScript)
- バックエンド: Fastify + Prisma + Redis (TypeScript)
- データベース: PostgreSQL + Prisma ORM
- テスト: Vitest（単体）/ Playwright（E2E）

## 主要コマンド

### ルート
```bash
npm run dev              # フロントエンドとバックエンドを両方起動
npm run dev:db           # データベースコンテナを起動
npm run dev:db:down      # データベースコンテナを停止
npm run dev:backend      # バックエンドのみ起動
npm run dev:frontend     # フロントエンドのみ起動
```

### フロントエンド（`frontend/`）
```bash
npm run dev              # 開発サーバー（Vite）
npm run build            # 本番ビルド
npm run preview          # 本番ビルドのプレビュー
npm run test             # 単体テスト（Vitest）
npm run test:ui          # テストUI
npm run test:e2e         # E2E（Playwright）
npm run lint             # ESLint
npm run typecheck        # 型チェック
npm run check            # lint + typecheck + test + build
npm run format           # Prettierフォーマット
```

### バックエンド（`backend/`）
```bash
npm run dev              # 開発サーバー（tsx watch）
npm run dev:e2e          # Prisma生成を含めて起動
npm run dev:worker       # バックグラウンドワーカー
npm run build            # TypeScriptコンパイル
npm run start            # 本番サーバー
npm run start:worker     # 本番ワーカー
npm run test             # 単体テスト（Vitest）
npm run test:ui          # テストUI
npm run lint             # ESLint
npm run format           # Prettierフォーマット
npm run migrate:dev      # Prismaマイグレーション（開発）
npm run migrate:deploy   # Prismaマイグレーション（デプロイ）
npm run prisma:generate  # Prismaクライアント生成
npm run prisma:studio    # Prisma Studio
npm run seed             # シード実行
```

## 単体テスト（1件だけ実行）

### フロントエンド
```bash
npm run test -- utils/queryString.test.ts
npm run test -- --grep "buildQueryString"
npm run test -- utils/queryString.test.ts --watch
```

### バックエンド
```bash
npm run test -- utils/validation.test.ts
npm run test -- --grep "validatePassword"
npm run test -- utils/validation.test.ts --watch
```

## コードスタイル

### TypeScript/型
- strictモード有効、noUnusedLocals/noUnusedParameters/noFallthroughCasesInSwitchを強制
- 型ガードは型述語を使う（例: value is string）
- バリデーションは `{ ok: boolean, reason?: string }` の形を返す
- null/undefinedの扱いを明確にし、表示用は `-` など安全値を返す

### インポート順
```typescript
// 1. Node.js組み込み
import path from 'node:path'

// 2. 外部依存関係
import { FastifyInstance } from 'fastify'
import React from 'react'

// 3. 内部モジュール（相対インポート）
import { buildErrorPayload } from './utils/errors'
import { formatCurrency } from '../utils/format'
```

### 命名規則
- ファイル: ユーティリティはkebab-case、ReactコンポーネントはPascalCase
- 関数/変数: camelCaseで説明的に命名
- エクスポート定数: UPPER_SNAKE_CASE
- 型/インターフェース: PascalCase

### エラー処理
- バックエンドは `buildErrorPayload` を使って統一形式で返す
- ユーティリティは例外よりも `null` / `undefined` / 代替値で安全に返す
```typescript
export const badRequest = (message: string, details?: ErrorDetails) =>
  buildErrorPayload(400, message, details)

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return currencyFormatter.format(value)
}
```

### フォーマット
- 2スペースインデント、LF、末尾改行、末尾空白なし（markdown以外）
- `.editorconfig` と Prettier の設定に従う

### フロントエンド規約
- React 18 + JSX transform
- Tailwind CSSを使用し、条件付きクラスは `clsx` / `tailwind-merge`
- ルーティングは React Router DOM
- Propsは明確な型定義を付ける

### バックエンド規約
- Fastify + Zodで入力検証
- PrismaでDB操作、BullMQ + Redisでジョブキュー
- 認証はJWT、パスワードはbcryptjs

### DB/環境
- スキーマ変更はPrismaマイグレーションで行う
- `.env.example` をテンプレートにし、テスト用DBは分離

## CI/運用
- CIは `.github/workflows/ci.yml` を参照
- ローカル開発はDocker Compose（`infra/docker-compose.yml`）

## Cursor/Copilotルール
- `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md` は確認時点で未検出
