# 図表インデックス

## 作成済み（現状実装ベース）
- `Docs/diagrams/architecture.md`: システムコンテキスト / C4 / 論理・物理 / ネットワーク / 認証境界 / 依存 / DDD / 4+1
- `Docs/diagrams/behavior.md`: シーケンス / ステート / タイミング / 例外 / リトライ / 冪等性
- `Docs/diagrams/data.md`: ER / データフロー / データ辞書 / CRUD / インデックス / キャッシュ / 互換・移行
- `Docs/diagrams/api.md`: API一覧 / 認証 / エラーコード / レート制限 / Webhook / 非同期API
- `Docs/diagrams/frontend.md`: サイトマップ / 画面遷移 / コンポーネントツリー / 状態管理
- `Docs/diagrams/implementation.md`: クラス図 / 契約 / 例外 / ログ / 設定 / Feature Flag
- `Docs/diagrams/testing.md`: テスト戦略 / ピラミッド / 計画 / 品質ゲート
- `Docs/diagrams/cicd.md`: CI/CD パイプライン / 環境 / ロールバック
- `Docs/diagrams/operations.md`: 監視 / Runbook / バックアップ
- `Docs/diagrams/security.md`: 脅威モデル / STRIDE / RBAC / Secrets
- `Docs/diagrams/all.md`: 上記を結合した単一ファイル

## 未定義 / 非該当（現状の実装では未整備）
- サービスメッシュ / サービスディスカバリ
- マルチテナント構成
- gRPC / GraphQL など別プロトコル
- 分散トランザクション / サガ
- 明示的ロック設計・バックプレッシャー設計
- SLI/SLO・アラート・オンコール体制（運用未整備）
- DR / 容量計画 / コスト内訳
- ブランチ戦略・リリースチェックリスト（運用未整備）
