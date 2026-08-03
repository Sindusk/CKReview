#!/bin/bash

set -euo pipefail

# Everything lives inside main() so bash parses the whole script before any of
# it runs. Without that, `git reset --hard` below rewrites this file while bash
# is still reading it by byte offset, and execution resumes mid-garbage — a
# self-updating deploy script has to be parsed up front to be safe.
main() {
  echo "Pulling latest code..."

  # The remote must be the authenticated SSH URL. GitHub throttles anonymous
  # git-upload-pack from this host hard enough that a fetch takes 40-60s and
  # looks like a hang; over SSH the same fetch is well under a second.
  # --progress keeps the transfer visible, and the timeout turns a genuine
  # stall into a loud failure rather than a silent wait.
  if ! timeout 300 git fetch --progress origin main; then
    echo "git fetch failed or timed out after 300s." >&2
    echo "Check: git remote -v  (should be an SSH URL, not https://)" >&2
    exit 1
  fi

  git reset --hard origin/main
  git log -1 --format='Now at %h %s'

  echo "Installing dependencies..."
  npm install

  echo "Generating Prisma client..."
  npx prisma generate

  echo "Building..."
  npm run build

  echo "Syncing database schema..."

  attempts=0
  max_attempts=$(( $(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l) + 2 ))

  while ! migrate_output=$(npx prisma migrate deploy 2>&1); do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      echo "$migrate_output"
      echo "Migration recovery is not converging after $attempts attempts; aborting."
      exit 1
    fi

    if echo "$migrate_output" | grep -q "P3009"; then
      failed_migration=$(echo "$migrate_output" | sed -n 's/.*The `\([^`]*\)` migration.*/\1/p' | head -n1)
      if [ -n "$failed_migration" ]; then
        echo "Resolving failed migration record: $failed_migration"
        npx prisma migrate resolve --applied "$failed_migration"
        continue
      fi
    fi

    if echo "$migrate_output" | grep -q "P3018" \
      && echo "$migrate_output" | grep -qE "already exists|42P07|42710|42701"; then
      failed_migration=$(echo "$migrate_output" | sed -n 's/^Migration name: //p' | head -n1)
      if [ -n "$failed_migration" ]; then
        echo "Baselining already-existing migration: $failed_migration"
        npx prisma migrate resolve --applied "$failed_migration"
        continue
      fi
    fi

    echo "$migrate_output"
    exit 1
  done

  echo "$migrate_output" | tail -n 3

  echo "Restarting..."
  pm2 restart wowvods

  echo "Done!"
}

main "$@"
