#!/bin/bash
set -e

echo "[entrypoint] Waiting for Postgres to be ready..."
# Small delay to make sure Postgres is fully up
sleep 2

echo "[entrypoint] Running database migrations..."
flask db upgrade

echo "[entrypoint] Starting application..."
exec "$@"
