# Plan

フロントエンドの重複を削り、定義の単一化で最終的なコード量を最小化する。ルート/ナビ/ラベル/ステータス/データ取得の共通化を進め、不要な分岐やコンポーネントを削除しつつ現行挙動を維持する。

## Scope
- In: ルート/ナビの単一化、ラベル・ステータス辞書の集約、データ取得/エラー表示の共通化、UIの重複削除、最小テスト追加
- Out: バックエンド変更、新機能追加、大規模なデザイン刷新、新規ライブラリ導入

## Action items
[x] 洗い出し: `rg` で重複定義と文字列の散在を棚卸しする（`frontend/src/App.tsx`, `frontend/src/constants/routes.tsx`, `frontend/src/constants/labels.ts`, `frontend/src/components/ui/StatusBadge.tsx`, `frontend/src/pages/*.tsx`）
[x] 統合: ルートとナビ定義を単一設定にまとめ、`frontend/src/App.tsx` と `frontend/src/components/Layout.tsx` をその設定から生成する；二重定義を削除する
[x] 集約: ラベル/ステータス辞書を `frontend/src/constants/labels.ts` に集約し、`frontend/src/components/ui/StatusBadge.tsx` で表示変換を完結させる；ページ側の個別マッピングを削除する（`frontend/src/pages/TaskDetail.tsx`, `frontend/src/pages/ProjectDetail.tsx`, `frontend/src/pages/Wholesales.tsx`, `frontend/src/pages/WholesaleDetail.tsx`）
[x] 簡素化: データ取得とエラー文言を `frontend/src/hooks/useApi.ts` と `frontend/src/constants/labels.ts` に寄せ、ページ側の重複ハンドラ/文字列を削除する（`frontend/src/pages/Home.tsx`, `frontend/src/pages/Tasks.tsx`, `frontend/src/pages/Projects.tsx`, `frontend/src/pages/CompanyDetail.tsx`）
[x] 共通化: Loading/Empty/Error 表示を既存UIに統一し、ページのインラインUIを削除して行数を減らす（`frontend/src/components/ui/LoadingState.tsx`, `frontend/src/components/ui/EmptyState.tsx`, `frontend/src/components/ui/ErrorAlert.tsx`）
[x] 権限整理: admin専用の取得とUI表示を `isAdmin` で一箇所に集約し、非admin時の不要なAPI呼び出しとエラー処理を削除する（`frontend/src/pages/CompanyDetail.tsx`, `frontend/src/pages/ChatworkSettings.tsx`）
[x] エッジ検証: 未知ステータスのフォールバック、空配列表示、非adminでのアクセス制御を確認し、必要な最小コードだけ追加する
[x] テスト/検証: `npm run lint`, `npm run typecheck`, `npm run test -- --run` を実行し、必要最小限のユニットテストを追加/更新する（`frontend/src/components/ui/StatusBadge.test.tsx`, `frontend/src/constants/routes.test.ts`）※React RouterのFuture Flag警告は出るがテストは全件パス

## Open questions
- なし
