#!/usr/bin/env sh
#
# S3Vault
# A Serverless File Vault
# https://github.com/ashenm/S3Vault
#
# Ashen Gunaratne
# mail@ashenm.ml
#

# errexit
set -e

# ensure package.zip
test -f package.zip || {
  echo "\033[31;1m[FATAL] Missing deployment package (package.zip)\033[0m" >&2
  exit 1
}

# update lambda function code
aws lambda update-function-code --region "${AWS_REGION:-us-east-1}" \
  --function-name "S3Vault" --zip-file "fileb://package.zip"

# vim: set expandtab shiftwidth=2 syntax=sh:
