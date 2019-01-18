#!/usr/bin/env sh
# deploy wrapper

./vault.sh --no-compile --zone "$CLOUDFLARE_ZONE_ID" \
  --distribution "$AWS_CLOUDFRONT_DISTRIBUTION" deploy
