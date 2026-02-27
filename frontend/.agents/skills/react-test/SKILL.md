---
name: react-test
description: >
  Reactプロジェクトでテストコードを作成する際のスキル。
  単体テスト、結合テスト、コンポーネントテスト、統合テスト、E2Eテスト、
  Testing Library、Vitest、Jest、MSW に関するリクエストで必ず使用すること。
  「テストを書いて」「テストを追加して」「テストが壊れた」などの指示にも適用する。
---

# テストコードルール

## テストスタイル

**古典派テスト（振る舞いの検証）** を採用する。  
実装の詳細ではなく、外部から観察可能な振る舞いをテストすること。

テストを作成修正する際は `.agents/skills/react-test/SKILL.md` のテンプレートに従うこと。

## 必須事項

- テストケースは Arrange-Act-Assert（Given-When-Then）パターンで構成する
- テスト名はビジネス上の意味が伝わる日本語で記述する
- モックは外部依存（API、ブラウザAPI、日時）に限定する
- コンポーネントのテストでは `getByRole`, `getByLabelText`, `getByText` などユーザー目線のセレクタを使う
- ユーザー操作のシミュレーションには `userEvent` を使う（`fireEvent` より優先）

## 禁止事項

- state や props の値を直接検証しない
- 内部メソッドの呼び出し回数引数を検証しない（境界のコールバックは例外）
- 子コンポーネントやカスタムフックを安易にモックしない
- カバレッジ稼ぎ目的のテストを追加しない
- 親コンポーネントで検証済みの振る舞いを子でも重複テストしない
- スナップショットテストは原則使用しない

## テスト戦略の判断基準

- ビジネスロジックが薄いシンプルなCRUD: 統合テストのみで十分
- 複雑な条件分岐や計算がある: 単体テスト + コンポーネントテスト
- API連携を含む画面: MSW を使った統合テスト

---

# React テスト作成スキル

## 概要

React/TypeScript プロジェクトでテストコードを作成するためのスキル。  
古典派（デトロイト派）のテストスタイルを採用し、振る舞いの検証に集中する。

## 基本原則

テストは「コードが何をするか（振る舞い）」を検証する。「どうやっているか（実装の詳細）」は検証しない。

1. **入力に対する出力状態変化を検証する**（振る舞いの検証）
2. **内部のメソッド呼び出しやstate変更を直接検証しない**（実装の詳細を避ける）
3. **モックは外部依存（API、DB）に限定する**（古典派スタイル）
4. **同じ振る舞いを複数の層で重複テストしない**（二重保証の回避）
5. **カバレッジ100%を目指さない**（量より質）

## ツール構成

| 用途 | ツール |
|---|---|
| テストランナー | Vitest（推奨）または Jest |
| コンポーネントテスト | @testing-library/react + @testing-library/user-event |
| APIモック | MSW (Mock Service Worker) |
| E2E | Playwright（必要な場合のみ） |

プロジェクトに既にテストツールが導入されている場合はそちらに合わせること。

## テストファイルの配置

対象ファイルと同じディレクトリに `.test.ts` / `.test.tsx` で作成する。

## テストの命名規則

ビジネス上の意味が伝わる名前をつける。メソッド名をそのままテスト名にしない。

```typescript
// 悪い例
describe("calcTax", () => {
  it("should call Math.round", ...);
});

// 良い例
describe("税込価格の計算", () => {
  it("税率10%で1000円の場合、1100円になる", ...);
});
```

## モックの方針

| 対象 | モックする？ | 理由 |
|---|---|---|
| 外部API | MSWで | ネットワーク依存を排除 |
| ブラウザAPI（localStorage等） | 必要に応じて | テスト環境に存在しない場合 |
| 子コンポーネント | 原則しない | 実際の振る舞いを検証するため |
| カスタムフック | 原則しない | コンポーネント経由で間接的に検証 |
| ユーティリティ関数 | しない | 実物を使う（古典派スタイル） |
| 日時（Date） | 固定値にする | テストの再現性のため |

---

## テンプレート

### 1. 純粋関数の単体テスト

```typescript
import { describe, it, expect } from "vitest";
import { calcTax } from "./calcTax";

describe("税込価格の計算", () => {
  it.each([
    { price: 1000, taxRate: 0.1, expected: 1100, label: "税率10%で1000円 → 1100円" },
    { price: 500, taxRate: 0.08, expected: 540, label: "税率8%で500円 → 540円" },
    { price: 0, taxRate: 0.1, expected: 0, label: "価格が0なら0のまま" },
  ])("$label", ({ price, taxRate, expected }) => {
    // When
    const result = calcTax(price, taxRate);
    // Then
    expect(result).toBe(expected);
  });

  it("負の価格はエラーになる", () => {
    expect(() => calcTax(-100, 0.1)).toThrow("価格は0以上");
  });
});
```

### 2. カスタムフックのテスト

コンポーネントテストで間接的に検証できる場合は不要。  
フック固有の複雑なロジックがある場合にのみ書く。

```typescript
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./useCounter";

describe("カウンター", () => {
  it("初期値からカウントアップできる", () => {
    // Given
    const { result } = renderHook(() => useCounter(5));
    // When
    act(() => result.current.increment());
    // Then
    expect(result.current.count).toBe(6);
  });

  it("0より小さくはならない", () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
  });
});
```

### 3. コンポーネントテスト

ユーザー目線でテストする。stateではなく画面に見える変化で検証する。

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

describe("ログインフォーム", () => {
  it("メールとパスワードを入力してログインできる", async () => {
    // Given
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockSubmit} />);

    // When
    await user.type(screen.getByLabelText("メールアドレス"), "test@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    // Then
    expect(mockSubmit).toHaveBeenCalledWith("test@example.com", "password123");
  });

  it("未入力で送信するとエラーが表示される", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "メールアドレスとパスワードを入力してください"
    );
  });
});
```

### 4. 統合テスト（API連携MSW使用）

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { UserList } from "./UserList";

const server = setupServer(
  http.get("/api/users", () => {
    return HttpResponse.json([
      { id: 1, name: "田中太郎", role: "admin" },
      { id: 2, name: "佐藤花子", role: "member" },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ユーザー一覧画面", () => {
  it("APIから取得したユーザーが一覧表示される", async () => {
    render(<UserList />);
    expect(await screen.findByText("田中太郎")).toBeInTheDocument();
    expect(screen.getByText("佐藤花子")).toBeInTheDocument();
  });

  it("API取得失敗時にエラーメッセージが表示される", async () => {
    server.use(
      http.get("/api/users", () => HttpResponse.json(null, { status: 500 }))
    );
    render(<UserList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("取得に失敗");
  });
});
```

---

## アンチパターン（避けるべきテスト）

### 実装の詳細をテストしている

```typescript
// stateの更新関数をスパイしている → リファクタリングで壊れる
const setCount = vi.fn();
vi.spyOn(React, "useState").mockReturnValue([0, setCount]);
render(<Counter />);
fireEvent.click(screen.getByText("+"));
expect(setCount).toHaveBeenCalledWith(expect.any(Function));
```

### 振る舞いをテストしている

```typescript
// 画面に見える結果を検証 → リファクタリングに強い
const user = userEvent.setup();
render(<Counter />);
await user.click(screen.getByRole("button", { name: "+" }));
expect(screen.getByText("1")).toBeInTheDocument();
```
