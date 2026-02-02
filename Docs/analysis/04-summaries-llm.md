# 04 サマリー/LLM

## 1. 概要
- 会社のメッセージから要約ドラフトを生成する
- LLM 実行は JobQueue で非同期化し、`summary_drafts` に保存する

## 2. 関連ファイル
### Backend
- ルート: `backend/src/routes/summaries.ts`
- ハンドラ: `backend/src/routes/summaries.handlers.ts`
- サービス: `backend/src/services/summaryGenerator.ts`
- LLM: `backend/src/services/llm.ts`
- キュー: `backend/src/services/jobQueue.ts`

## 3. API
- `POST /api/companies/:id/summaries/draft`
  - 既存Draftのキャッシュ確認後にJob投入
- `POST /api/companies/:id/summaries`
  - Draft から metadata を引き継いで Summary を作成
- `GET /api/companies/:id/summaries`
- `POST /api/summaries/:id/tasks/candidates`

## 4. 実装の流れ
- Draft生成
  - 期間指定で Draft を要求
  - 既存Draftがあれば返却、なければ job enqueue
- Job処理
  - `generateSummaryDraft` で LLM を呼び出し Draft upsert

## 5. 実装詳細
- `generateSummaryDraft`
  - メッセージを収集し、件数や内容を整形
- `LLMClient.summarize`
  - 40件ごとに chunk して map-reduce で集約
- `createSummaryHandler`
  - Draft の `sourceLinks/model/promptVersion/sourceMessageCount/tokenUsage` を保存

## 6. 気になる点
- **プロンプト品質**: `SYSTEM_PROMPT`/`REDUCE_PROMPT` の精度不足
- **キャンセル整合性**: Job cancel と LLM 実行の同期が不完全
- **TTL設計**: Draft の有効期限が未定義
- **言語/文字コード**: PROMPT_VERSION の扱い
- **可観測性**: 実行ログやトークン消費の記録が不足

## 7. 改善案
- UTF-8 で `PROMPT_VERSION` を定数化
- `generateSummaryDraft` の `isCanceled` を尊重
- Draft の更新条件を明確化 (期間/メッセージ件数)
- まとめ処理の定数を `const` に集約

## 8. TODO
- Draft のTTLと削除ロジック
- 失敗時の再試行/再生成
- 100/300/500件などの分割パターンの検証
