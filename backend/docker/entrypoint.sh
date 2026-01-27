#!/bin/sh
set -e

RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SEED="${RUN_SEED:-false}"
RUN_MODE="${RUN_MODE:-web}"

export PATH="/app/node_modules/.bin:${PATH}"

if [ "$RUN_MIGRATIONS" = "true" ]; then
  prisma migrate deploy
fi

if [ "$RUN_SEED" = "true" ]; then
  node --experimental-specifier-resolution=node dist/prisma/seed.js
fi

if [ "$RUN_MODE" = "worker" ]; then
  exec node --experimental-specifier-resolution=node dist/worker.js
fi

exec node --experimental-specifier-resolution=node dist/index.js
