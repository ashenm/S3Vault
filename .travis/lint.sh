#!/usr/bin/env sh
# lint build source

curl -sSLo .eslintrc.json \
  https://gist.githubusercontent.com/ashenm/537a91f9c864d6ef6180790d9076047d/raw/eslintrc.json \
&& eslint -c .eslintrc.json src
