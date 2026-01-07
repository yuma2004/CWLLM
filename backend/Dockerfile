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
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY docker ./docker
COPY package.json ./

EXPOSE 3000

# --experimental-specifier-resolution=node でディレクトリインポートを許可
RUN chmod +x /app/docker/entrypoint.sh
ENTRYPOINT ["/app/docker/entrypoint.sh"]
