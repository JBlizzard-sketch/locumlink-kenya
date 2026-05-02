#!/usr/bin/env bash
# LocumLink Kenya — GitHub sync script
# Usage:  bash scripts/src/github-push.sh ["optional commit message"]
# Pushes current HEAD to github.com/JBlizzard-sketch/locumlink-kenya

set -e

BRANCH="main"
REPO_URL="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/JBlizzard-sketch/locumlink-kenya.git"
MSG="${1:-chore: sync from Replit [$(date '+%Y-%m-%d %H:%M UTC')]}"

echo "==> Pushing branch '${BRANCH}' to GitHub..."
git -c user.email="locumlink@replit.dev" \
    -c user.name="LocumLink Kenya" \
    push "$REPO_URL" "$BRANCH" 2>&1

echo ""
echo "==> Done.  https://github.com/JBlizzard-sketch/locumlink-kenya"
