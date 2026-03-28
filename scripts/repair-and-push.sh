#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "Expected to run on main, found '$branch'." >&2
  exit 1
fi

message="${1:-Reorganize repo into frontend/backend layout}"

echo "Fetching latest origin/main..."
git fetch origin main

echo
echo "Status before repair:"
git status --short --branch

echo
echo "Resetting local main to origin/main while preserving working tree..."
git reset --mixed origin/main

echo
echo "Status after reset:"
git status --short --branch

echo
echo "Staging all non-ignored changes..."
git add -A

echo
echo "Final staged summary:"
git status --short --branch

echo
echo "Committing..."
git commit -m "$message"

echo
echo "Pushing to origin/main..."
git push origin HEAD:main

echo
echo "Done."
