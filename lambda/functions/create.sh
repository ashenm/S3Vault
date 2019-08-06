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

# extract layer arns
test -r ../layers/arns.txt && {
  AWS_LAMBDA_LAYER_ARNS="$(cat ../layers/arns.txt | tr --squeeze-repeats '[:space:]' ' ' | sed 's/\s$//')"
}

# ensure layer arns within cli limit
test "$(echo "$AWS_LAMBDA_LAYER_ARNS" | wc --chars)" -gt "140" && {
  echo "\033[33;1m[WARNING] Amazon Resource Name (ARN) references exceeds maximum cli length\033[0m" >&2
  echo "\033[33;1m[WARNING] Configure layer references via AWS Management Console or API\033[0m" >&2
  unset AWS_LAMBDA_LAYER_ARNS
}

# create lambda function
aws lambda create-function --region "${AWS_REGION:-us-east-1}" \
  --function-name "S3Vault" --runtime "nodejs10.x" --handler "index.index" \
  $(test -n "$AWS_LAMBDA_LAYER_ARNS" && echo -n --layers $AWS_LAMBDA_LAYER_ARNS) \
  --role "$AWS_EXECUTION_ROLE_ARN" --zip-file "fileb://package.zip"

# vim: set expandtab shiftwidth=2 syntax=sh:
