FROM node:18-alpine AS build

WORKDIR /app

# OpenSSL をインストール（Prisma用）
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npm run prisma:generate
RUN npm run build

# シードスクリプトをビルド
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module ESNext --moduleResolution node --target ES2020
RUN npm prune --omit=dev

FROM node:18-alpine

WORKDIR /app
RUN apk add --no-cache curl openssl
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000

# マイグレーション→シード→サーバー起動
# --experimental-specifier-resolution=node でディレクトリインポートを許可
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js && node --experimental-specifier-resolution=node dist/index.js"]
