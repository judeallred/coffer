#!/usr/bin/env bash
# Cloudflare Pages: install pinned Deno, then build static site to ./dist
# Optional env (set in Pages → Settings → Environment variables):
#   DENO_VERSION  — default v2.7.11
#   BASE_PATH     — default /

set -euo pipefail

DENO_VERSION="${DENO_VERSION:-v2.7.11}"
BASE_PATH="${BASE_PATH:-/}"

echo "==> Installing Deno ${DENO_VERSION}"
curl -fsSL https://deno.land/install.sh | sh -s "${DENO_VERSION}"
export PATH="${HOME}/.deno/bin:${PATH}"
deno --version

echo "==> Enabling pnpm (packageManager in package.json)"
corepack enable
corepack prepare pnpm@9.0.0 --activate

echo "==> Installing Node dependencies"
pnpm install --frozen-lockfile

echo "==> Installing Deno dependencies (deno.lock)"
deno install

echo "==> Building (BASE_PATH=${BASE_PATH})"
export BASE_PATH
deno task build

echo "==> Done. Output: ./dist"
