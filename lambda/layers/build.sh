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

# clinch permissions
umask 0022

# build package archives
while read -r PACKAGE
do

  # construct path
  SOURCE="/tmp/layer-$PACKAGE"

  # ensure empty folder
  rm --recursive --force "$SOURCE" \
    && mkdir --parent "$SOURCE/nodejs"

  # initialise package.json
  ( cd "$SOURCE/nodejs" && npm init --yes ) \
    1> /dev/null

  # install package
  npm install --save --prefix "$SOURCE/nodejs" "$PACKAGE" \
    1> /dev/null

  # zip package
  bsdtar --create --format zip --file "$PACKAGE.zip" \
    --strip-components 3 "$SOURCE"

  # clean build stage
  rm --recursive --force "$SOURCE"

done < layers.txt

# vim: set expandtab shiftwidth=2 syntax=sh:
