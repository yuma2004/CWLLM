# 全体リファクタリング計画（CWLLM_Ver1）

## 参照ドキュメント
- Docs/AI/project-map.md
- Docs/AI/feature-dependency-map.md
- Docs/AI/dependency-clusters/*.md
- Docs/要件定義書.md
- Docs/ChatWork_API仕様.md

## 目的
- リポジトリ全体を「シンプルで扱いやすい構造」に寄せる
- 重複実装を削減し、一般化できる箇所を共通化する
- 命名規則とモジュール境界を明確にし、開発時の迷いを減らす
- 既存の振る舞い・API・DBスキーマ・権限制御を維持する

## 制約（非ゴール）
- 仕様変更/機能追加/ロジック改善は行わない（挙動維持）
- 新規ランタイム依存は追加しない（必要なら提案して停止）
- 大規模な移動/リネームは避け、段階的に進める

## 現状整理（Docs要約）
- バックエンド: Fastify + Prisma + BullMQ（index/worker/Routes/Services/Utils）
- フロントエンド: React + Vite + Tailwind（Pages/Components/Hooks/Lib/Types）
- 機能は9クラスター（認証、会社/連絡先、案件/卸、タスク、メッセージ、Chatwork連携、サマリー/LLM、ジョブ基盤、ダッシュボード/CSV/設定/監査）

## 主要な整理対象（重複/一般化候補）
- ルート/ハンドラ/スキーマの分割ルールがクラスターで揺れている
- バリデーション/ページング/キャッシュ/監査ログなどの横断ロジックが散在
- API ルート定義とフロント参照の対応が手動でドリフトしやすい
- フロントのページ内ロジックが肥大化し、フォーム/フィルタ/一覧が重複しやすい
- 命名規則（ファイル/関数/型）が暗黙で統一指針が不足

## 方針
- クラスター境界を守り、共通基盤は utils/services に集約
- 既存ディレクトリを維持しつつ、分割・整理の型だけを揃える
- 小さな差分で段階実施し、各フェーズでテストを通す

## 命名規則（暫定）
- ルート登録: `routes/<resource>.ts`
- ハンドラ: `routes/<resource>.handlers.ts`
- スキーマ/型: `routes/<resource>.schemas.ts` / `types/<domain>.ts`
- サービス: `services/<domain>.ts`（名詞）、関数は動詞 + 対象
- フロント: Pages/Components は PascalCase、Hooks は `useXxx`

## フェーズ計画
### Phase 0: ベースライン
- Docs と実装の差分棚卸し（クラスター単位）
- 現行テストの実行手順を確定
  - `npm --prefix backend test`
  - `npm --prefix frontend test`
  - `npm --prefix frontend test:e2e`（必要時）

### Phase 1: バックエンド基盤の統一
- ルート構成の統一（handlers/schemas 分離、命名統一）
- `utils` の共通化（validation/pagination/normalize/ttlCache/errors/prisma）
- 監査ログ/ジョブ/Chatwork/サマリーの境界整理（呼び出し経路の簡素化）
- キャッシュキー/TTL の定数化

### Phase 2: フロントエンド基盤の統一
- APIレイヤ整理（apiClient/useApi/useApiClient の責務統一）
- 一覧/検索/作成/編集の共通 UI/Hook 化
- ルーティング定義と API 参照の整合性確認
- 型定義の整理（entities/filters/dashboard を用途別に集約）

### Phase 3: 横断整備
- テストユーティリティの整理と不足箇所の補完
- README/Docs の更新（命名規則/構造/開発手順）
- infra/scripts の整備（起動/バックアップ/復旧の明文化）

## リスク/注意
- API/DB/挙動の変更は厳禁。差分は小さく分割してレビュー
- ベースラインテストが落ちた場合は修正せず報告で停止
- 依存関係追加が必要になった場合は提案して停止
