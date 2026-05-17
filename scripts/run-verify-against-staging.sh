#!/usr/bin/env bash
set -euo pipefail

# Usage: set VITE_API_BASE_URL and VITE_COMPILER_URL then run this script

if [ -z "${VITE_API_BASE_URL:-}" ] || [ -z "${VITE_COMPILER_URL:-}" ]; then
  echo "Please set VITE_API_BASE_URL and VITE_COMPILER_URL environment variables." >&2
  exit 2
fi

echo "Running verify:production-launch against staging..."
VITE_API_BASE_URL="$VITE_API_BASE_URL" VITE_COMPILER_URL="$VITE_COMPILER_URL" npm --prefix lms-backend run verify:production-launch
