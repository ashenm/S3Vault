#!/usr/bin/env sh
# verify build dependencies

set -e

# jq
jq --version

# AWS cli
aws --version
