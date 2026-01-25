# タスク管理・企業管理ページ UI改善計画

## 目標
Notion風のシンプルでミニマルなUIに刷新する
- 見た目・デザインの改善
- 操作性・UXの改善
- 情報構造の改善

## 現状の問題点
1. 情報密度が高く画面が散らかっている
2. 作成フォームが常時表示でスペースを占有
3. フィルターが5〜7列で常に展開
4. 複数選択がネイティブ`<select multiple>`で使いにくい
5. sky-600の強いアクセントカラー

---

## Phase 1: デザイン基盤整備

### 1.1 Tailwindカラートークン追加
**ファイル:** `frontend/tailwind.config.js`

```js
colors: {
  notion: {
    bg: '#ffffff',
    'bg-hover': '#f7f6f3',
    'bg-secondary': '#fbfbfa',
    border: '#e4e4e4',
    'border-light': '#ebebea',
    text: '#37352f',
    'text-secondary': '#787774',
    'text-tertiary': '#9b9a97',
    accent: '#2383e2',
  }
}
```

### 1.2 新規UIコンポーネント作成
| コンポーネント | 用途 |
|---|---|
| `SlidePanel.tsx` | 右からスライドインするパネル（作成フォーム用） |
| `Popover.tsx` | インライン編集用ポップオーバー |
| `MultiSelect.tsx` | タグ形式の複数選択（担当者選択用） |

---

## Phase 2: タスク管理ページ改善

### 2.1 Tasks.tsx レイアウト変更
**現状:** 3カラム（テーブル2列 + 作成フォーム1列）
**改善:** 1カラム + スライドパネル

```
変更前:
┌─────────────────┬────────┐
│ フィルター(5列)  │ 作成   │
│ テーブル        │ フォーム│
└─────────────────┴────────┘

変更後:
┌─────────────────────────────┐
│ [タイトル]      [+ 新規作成] │
│ [検索バー] [フィルター▼]    │
│ テーブル（フル幅）          │
└─────────────────────────────┘
         ↓ [+ 新規作成] クリック
┌───────────────────┬─────────┐
│ テーブル          │SlidePanel│
│                   │ 作成    │
│                   │ フォーム │
└───────────────────┴─────────┘
```

### 2.2 TaskFilters.tsx 折り畳み化
- デフォルト: 検索バー + フィルターボタンのみ表示
- クリックでPopover内にフィルター表示
- アクティブフィルター数をバッジ表示

### 2.3 TaskTable.tsx 簡素化
**変更:**
- 7列 → 5列（タスク/ステータス/担当者/期限/操作）
- 「対象」はタイトル下にサブテキストで統合
- チェックボックス・操作ボタンはホバー時のみ表示
- ステータス/担当者/期限はクリックでPopover編集

### 2.4 TaskBulkActions.tsx フローティング化
- 選択時のみ画面下部中央に固定表示
- ダークバーにアクションボタン配置

---

## Phase 3: 企業管理ページ改善

### 3.1 Companies.tsx レイアウト変更
- 作成フォームをSlidePanel化
- フィルターを折り畳み式に

### 3.2 CompanyTable.tsx 改善
- 担当者選択をMultiSelectコンポーネントに置換
- アバターグループで視覚的に表示
- ホバーアクション採用

### 3.3 CompanyCreateForm.tsx 整理
- セクション分け（基本情報/分類/管理）
- Chatwork連携を折り畳み可能に
- SlidePanel内にフィット

---

## 修正対象ファイル一覧

### 新規作成
- `frontend/src/components/ui/SlidePanel.tsx`
- `frontend/src/components/ui/Popover.tsx`
- `frontend/src/components/ui/MultiSelect.tsx`

### 修正
- `frontend/tailwind.config.js` - カラートークン追加
- `frontend/src/index.css` - グローバルスタイル調整
- `frontend/src/pages/Tasks.tsx` - レイアウト変更
- `frontend/src/pages/Companies.tsx` - レイアウト変更
- `frontend/src/components/tasks/TaskTable.tsx` - 列削減、ホバーアクション
- `frontend/src/components/tasks/TaskFilters.tsx` - 折り畳み化
- `frontend/src/components/tasks/TaskBulkActions.tsx` - フローティング化
- `frontend/src/components/companies/CompanyTable.tsx` - MultiSelect適用
- `frontend/src/components/companies/CompanyFilters.tsx` - 折り畳み化
- `frontend/src/components/companies/CompanyCreateForm.tsx` - セクション整理

---

## 実装順序

1. **SlidePanel作成** → Tasks/Companies両方で使用
2. **Tailwindカラー追加** → 全体に適用
3. **Tasks.tsx改善** → SlidePanel適用、レイアウト変更
4. **TaskTable改善** → 列削減、ホバーアクション
5. **TaskFilters改善** → 折り畳み化
6. **Companies.tsx改善** → SlidePanel適用
7. **CompanyTable改善** → MultiSelect作成・適用
8. **細部調整** → 余白、フォントサイズ、ボーダー

---

## 検証方法

1. 開発サーバー起動: `npm run dev`
2. 各ページの動作確認:
   - `/tasks` - タスク一覧、フィルター、作成、一括操作
   - `/companies` - 企業一覧、フィルター、作成、担当者変更
3. レスポンシブ確認（モバイル〜デスクトップ）
4. TypeScriptエラーなし: `npm run typecheck`
