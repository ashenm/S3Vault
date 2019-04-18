#!/usr/bin/env sh
# verify build dependencies

set -e

# jq
echo "\033[34;1mjq version\033[0m"
jq --version

# AWS cli
echo "\033[34;1mAWS CLI version\033[0m"
aws --version

# lint
echo "\033[34;1mESLint version\033[0m"
eslint --version
