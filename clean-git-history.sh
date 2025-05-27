#!/bin/bash

# Remove large files from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/0.pack \
  .firebase/shut-up-and-run/functions/node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/client-production/0.pack \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/17.pack \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/1.pack \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/index.pack \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/index.pack.old \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/13.pack \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/5.pack \
  .firebase/shut-up-and-run/functions/.next/cache/webpack/server-production/7.pack" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up refs and garbage collect
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive 