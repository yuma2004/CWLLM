#!/bin/sh
set -e

RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SEED="${RUN_SEED:-false}"
RUN_MODE="${RUN_MODE:-web}"

echo "entrypoint: NODE_ENV=${NODE_ENV:-} RUN_MODE=${RUN_MODE} RUN_MIGRATIONS=${RUN_MIGRATIONS} RUN_SEED=${RUN_SEED} PORT=${PORT:-} BACKEND_PORT=${BACKEND_PORT:-}"

export PATH="/app/node_modules/.bin:${PATH}"

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "entrypoint: running prisma migrate deploy"
  prisma migrate deploy
  echo "entrypoint: prisma migrate deploy completed"
fi

if [ "$RUN_SEED" = "true" ]; then
  echo "entrypoint: running prisma seed"
  node --experimental-specifier-resolution=node dist/prisma/seed.js
  echo "entrypoint: prisma seed completed"
fi

if [ "$RUN_MODE" = "worker" ]; then
  exec node --experimental-specifier-resolution=node dist/worker.js
fi

exec node --experimental-specifier-resolution=node dist/index.js
