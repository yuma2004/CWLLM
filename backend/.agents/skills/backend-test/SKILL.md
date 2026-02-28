---
name: backend-test
description: Node.js/TypeScript の Web バックエンドで振る舞い検証中心のテストを作成する。Express/Fastify/NestJS 等の API テスト、サービス層の単体テスト、リポジトリ層の DB テスト、外部 API 連携テストに対応する。ユーザーが「テストを書いて」「テストを追加して」「テストが壊れた」「API のテスト」「エンドポイントのテスト」と依頼したときに必ず使う。
---

# Webバックエンド テスト作成スキル

## 概要

Node.js/TypeScript の Web バックエンドでテストコードを作成する。
古典派テスト（振る舞いの検証）を採用し、実装詳細ではなく外部から観測できる結果を検証する。

## テストスタイル

- Arrange-Act-Assert（Given-When-Then）で構成する
- テスト名はビジネス上の意味が伝わる日本語で記述する
- テスト間の実行順序に依存させない
- private メソッドを直接テストせず、public インターフェース経由で検証する

## 必須事項

- モック対象をプロセス外依存（DB、外部 API、メール、キュー等）に限定する
- サービス層のテストでは同一プロセス内依存（他サービス、ユーティリティ、値オブジェクト）を実物で使う
- API エンドポイントを `supertest` などで HTTP レベルの統合テストとして書く
- 外部 API を使うテストでは MSW または nock を使い、本番の外部サービスに接続しない

## 禁止事項

- 同一プロセス内依存（ヘルパー、ドメインモデル、値オブジェクト）をモックしない
- 内部メソッド呼び出し回数や引数の検証を乱用しない
- カバレッジ稼ぎ目的だけのテストを追加しない
- サービス層で検証済みの観点をリポジトリ単体で重複検証しない
- テスト中に本番外部 API/サービスへ接続しない

## テスト戦略の判断基準

- 純粋なビジネスロジック（計算・判定・状態遷移）: 単体テスト
- シンプルな CRUD（バリデーションが薄い）: API 統合テスト中心
- 複雑なビジネスロジック + DB: 単体テスト + API 統合テスト
- 外部 API 連携: MSW/nock でモック + 統合テスト
- ミドルウェア（認証・認可・エラーハンドリング）: API 統合テストで間接検証

## 推奨ディレクトリ構成

```text
src/
  domain/
    order.ts
    order.test.ts
  services/
    orderService.ts
    orderService.test.ts
  repositories/
    orderRepository.ts
    orderRepository.test.ts
  routes/
    orderRoutes.ts
    orderRoutes.test.ts
  middleware/
    auth.ts
  __tests__/
    setup.ts
```

## ツール構成

- テストランナー: Vitest（推奨）または Jest
- API テスト: supertest
- 外部 API モック: MSW（推奨）または nock
- DB テスト: テスト用 DB + マイグレーション、または Testcontainers
- 日時固定: `vi.useFakeTimers()`

既存プロジェクトに導入済みツールがある場合はそれに合わせる。

## モック方針

### プロセス外依存（モックする）

- DB
- 外部 API（Stripe、SendGrid など）
- メール送信
- メッセージキュー
- 日時（`Date.now`、`new Date()`）
- 大量 I/O を伴うファイルシステム

### プロセス内依存（モックしない）

- ドメインモデル・値オブジェクト
- 他サービスクラス
- ユーティリティ関数
- バリデーション関数

## テンプレート

### 1. ドメインモデル単体テスト

```typescript
import { describe, it, expect } from "vitest";
import { Order } from "./order";
import { OrderItem } from "./orderItem";

describe("注文", () => {
  describe("注文の作成", () => {
    it("商品を追加して注文を作成できる", () => {
      // Given
      const items = [
        new OrderItem({ productId: "P001", name: "Tシャツ", price: 2000, quantity: 2 }),
        new OrderItem({ productId: "P002", name: "帽子", price: 1500, quantity: 1 }),
      ];

      // When
      const order = Order.create({ customerId: "C001", items });

      // Then
      expect(order.totalAmount).toBe(5500);
      expect(order.status).toBe("pending");
      expect(order.itemCount).toBe(3);
    });

    it("商品が空の場合は注文を作成できない", () => {
      // Given / When / Then
      expect(() => Order.create({ customerId: "C001", items: [] })).toThrow(
        "注文には1つ以上の商品が必要です",
      );
    });
  });
});
```

### 2. サービス層単体テスト

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "./orderService";
import type { OrderRepository } from "../repositories/orderRepository";
import type { PaymentGateway } from "../gateways/paymentGateway";
import type { EmailSender } from "../gateways/emailSender";

describe("注文サービス", () => {
  let orderRepo: OrderRepository;
  let paymentGateway: PaymentGateway;
  let emailSender: EmailSender;
  let service: OrderService;

  beforeEach(() => {
    orderRepo = {
      findById: vi.fn(),
      save: vi.fn(),
    } as unknown as OrderRepository;

    paymentGateway = {
      charge: vi.fn().mockResolvedValue({ success: true, transactionId: "TX001" }),
    } as unknown as PaymentGateway;

    emailSender = {
      send: vi.fn().mockResolvedValue(undefined),
    } as unknown as EmailSender;

    service = new OrderService(orderRepo, paymentGateway, emailSender);
  });

  it("注文を確定し決済成功時に確認メールを送信する", async () => {
    // Given
    const order = createPendingOrder();
    vi.mocked(orderRepo.findById).mockResolvedValue(order);

    // When
    const result = await service.confirmAndPay("ORDER-001");

    // Then
    expect(result.status).toBe("confirmed");
    expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
    expect(paymentGateway.charge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: order.totalAmount }),
    );
    expect(emailSender.send).toHaveBeenCalled();
  });
});
```

### 3. API 統合テスト（supertest）

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app";
import { db } from "../db";

describe("注文API", () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await db("orders").truncate();
    await db("products").truncate();
    await db("products").insert([
      { id: "P001", name: "Tシャツ", price: 2000, stock: 10 },
      { id: "P002", name: "帽子", price: 1500, stock: 5 },
    ]);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("正常なリクエストで注文を作成できる", async () => {
    // When
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", "Bearer valid-token")
      .send({
        customerId: "C001",
        items: [
          { productId: "P001", quantity: 2 },
          { productId: "P002", quantity: 1 },
        ],
      });

    // Then
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      customerId: "C001",
      status: "pending",
      totalAmount: 5500,
      itemCount: 3,
    });
    expect(res.body.id).toBeDefined();
  });
});
```

### 4. 外部 API 連携テスト（MSW）

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { StripeGateway } from "./stripeGateway";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Stripe決済ゲートウェイ", () => {
  const gateway = new StripeGateway({ apiKey: "sk_test_xxx" });

  it("決済成功時にトランザクションIDを返す", async () => {
    // Given
    server.use(
      http.post("https://api.stripe.com/v1/charges", () =>
        HttpResponse.json({ id: "ch_123", status: "succeeded", amount: 5500 }),
      ),
    );

    // When
    const result = await gateway.charge({ amount: 5500, currency: "jpy" });

    // Then
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("ch_123");
  });
});
```

### 5. バリデーション境界値テスト

```typescript
import { describe, it, expect } from "vitest";
import { Email } from "./email";

describe("メールアドレス値オブジェクト", () => {
  it.each([
    { input: "user@example.com", valid: true, label: "正常なアドレス" },
    { input: "", valid: false, label: "空文字" },
    { input: "not-an-email", valid: false, label: "@がない" },
  ])("$label", ({ input, valid }) => {
    // Given / When / Then
    if (valid) {
      expect(() => new Email(input)).not.toThrow();
      return;
    }
    expect(() => new Email(input)).toThrow();
  });
});
```

### 6. 日時依存テスト

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CouponService } from "./couponService";

describe("クーポンサービス", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("有効期限内のクーポンは使用できる", () => {
    // Given
    vi.setSystemTime(new Date("2025-01-01"));
    const service = new CouponService();

    // When
    const result = service.apply("SPRING2025", { expiresAt: new Date("2025-03-31") });

    // Then
    expect(result.applied).toBe(true);
  });
});
```

## アンチパターン

- ドメインモデルをモックして振る舞い検証を欠落させる
- 内部メソッドの呼び出しを主目的に検証する
- 同一観点を層を跨いで重複検証する

## テスト実行

```bash
# 単体テスト
npm run test:unit

# 統合テスト（DB必要）
npm run test:integration

# 全テスト
npm test
```

## 実装時チェックリスト

- Given-When-Then の3段を明示したか
- テスト名が日本語でビジネス意味を表しているか
- プロセス外依存のみをモックしているか
- HTTP レベルで API を検証しているか
- テストが独立実行可能か
- 実装詳細ではなく結果を検証しているか
