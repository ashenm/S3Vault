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

# build directory for staging
BUILD_DIR="/tmp/lambda-package"

# copy deployment files
rsync --links --delete --recursive --perms --chmod D755,F644 \
  --exclude '*.sh' --exclude 'package.zip' . "$BUILD_DIR"

# build deployment package
bsdtar --create --format zip --file package.zip --strip-components 3 "$BUILD_DIR"

# clean build stage
rm --recursive --force "$BUILD_DIR"

# vim: set expandtab shiftwidth=2 syntax=sh:
