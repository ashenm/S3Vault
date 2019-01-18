#!/usr/bin/env sh
# build wrapper

./vault.sh --index 'vault' --script 'vault' \
  --index-ext '.html' --script-ext '.js' minify
