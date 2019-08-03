#!/usr/bin/env sh

set -e

# jq
curl -sSL https://github.com/stedolan/jq/releases/latest | \
  egrep -o '/stedolan/jq/releases/download/.*/jq-linux64' | \
  sudo wget --base=http://github.com/ -q -i - -O /usr/local/bin/jq && \
  sudo chmod 755 /usr/local/bin/jq

# .eslintrc
curl -sSLo .eslintrc.json https://gist.githubusercontent.com/ashenm/537a91f9c864d6ef6180790d9076047d/raw/eslintrc.json

# node packages
npm install

# vim: set expandtab shiftwidth=2 syntax=sh:
