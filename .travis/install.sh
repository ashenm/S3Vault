#!/usr/bin/env sh
# install build dependencies

set -e

# jq
curl --silent --header "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/stedolan/jq/releases/latest | \
  grep "browser_download_url.*linux64" | cut -d ':' -f 2,3 | tr -d '"' | \
  sudo xargs curl --silent --location --output /usr/local/bin/jq && \
  sudo chmod 755 /usr/local/bin/jq

# AWS cli
pip install --user awscli
