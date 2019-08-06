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

# publish package as lambda layer
while read -r PACKAGE
do

  aws lambda publish-layer-version --region "${AWS_REGION:-us-east-1}" \
    --compatible-runtimes "$(cat runtimes.txt)" --zip-file "fileb://${PACKAGE}.zip" \
    --layer-name "$(echo ${PACKAGE} | tr --complement --delete '[:alnum:]')"

done < layers.txt

# vim: set expandtab shiftwidth=2 syntax=sh:
