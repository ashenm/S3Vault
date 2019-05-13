#!/usr/bin/env sh
# S3Vault Deployer

set -e

#######################################
# Print usage instructions to STDOUT
# Arguments:
#   None
# Returns:
#   None
#######################################
usage() {

cat <<USAGE

Usage: $SELF [OPTIONS] ACTION
Build, test, and deploy S3Vault

Options:
      --css FILE            CSS file (default 'vault.css')
      --domain DOMAIN       S3Vault domain (default 'vault.ashenm.ml')
  -h, --help                Print usage
      --index FILENAME      Index document (default 'vault')
      --index-ext EXT       Index document extension (default '.html')
      --script FILENAME     JavaScript file (default 'vault')
      --script-index EXT    JavaScript file extension (default '.js')
      --zone ID             CloudFlare Zone ID

Action:
  minify                    Minify resource files
  purge                     Purge S3Vault edge caches

USAGE

}

#######################################
# Print invalid argument details to STDERR
# Arguments:
#   Invalid argument
# Returns:
#   None
#######################################
invalid() {

cat >&2 <<INVALID

$SELF: unrecognized option '$1'
Try '$SELF --help' for more information.

INVALID

}

#######################################
# Minify Resources
# Arguments:
#   None
# Returns:
#   None
#######################################
minify () {

  # minify JavaScript
  curl --silent \
    --show-error \
    --request POST \
    --output "/tmp/build.js" \
    --data-urlencode "output_format=json" \
    --data-urlencode "output_info=errors" \
    --data-urlencode "output_info=compiled_code" \
    --data-urlencode "compilation_level=SIMPLE_OPTIMIZATIONS" \
    --data-urlencode "js_code@src/$VAULT_SCRIPT$VAULT_SCRIPT_EXT" \
    --url "https://closure-compiler.appspot.com/compile"

  # ensure successful JavaScript compilation
  test "`jq '.errors' "/tmp/build.js"`" != "null" && \
    echo >&2 "ERROR Failed JavaScript Compilation" && \
    exit 1

  # extract JavaScript complied source
  jq --raw-output '.compiledCode' "/tmp/build.js" \
    > "dist/$VAULT_SCRIPT.min.js" && \
  echo "${ANSI_GREEN}SUCCESS Minifying JavaScript resources${ANSI_RESET}"

  # minify html
  ./node_modules/.bin/html-minifier \
    --collapse-boolean-attributes \
    --collapse-whitespace \
    --decode-entities \
    --minify-css \
    --minify-js \
    --remove-attribute-quotes \
    --remove-comments \
    --remove-empty-attributes \
    --remove-optional-tags \
    --remove-redundant-attributes \
    --remove-script-type-attributes \
    --remove-style-link-type-attributes \
    --remove-tag-whitespace \
    --sort-attributes \
    --sort-class-name \
    --use-short-doctype \
    --output "dist/vault.html" \
    "src/vault.html" && \
  echo "${ANSI_GREEN}SUCCESS Minifying HTML resources${ANSI_RESET}"

  # minify CSS
  ./node_modules/.bin/postcss \
    --output "dist/vault.css" "src/$VAULT_CSS" && \
  echo "${ANSI_GREEN}SUCCESS Minifying CSS resources${ANSI_RESET}"

}

#######################################
# Purge S3Vault Cloudflare edge caches
# Arguments:
#   None
# Returns:
#   None
#######################################
purge () {

  test "$VAULT_ZONE" && \
    curl --silent \
      --show-error \
      --request POST \
      --output /dev/null \
      --header "X-Auth-Key: $CLOUDFLARE_TOKEN" \
      --header "X-Auth-Email: $CLOUDFLARE_USER" \
      --header "Content-Type: application/json" \
      --data "{ \"files\": [ \"https://$VAULT_DOMAIN/$VAULT_INDEX$VAULT_INDEX_EXT\" ] }" \
      --url "https://api.cloudflare.com/client/v4/zones/$VAULT_ZONE/purge_cache" \
    && echo "${ANSI_GREEN}SUCCESS Purging CloudFlare Edge caches${ANSI_RESET}"

}

# script reference
SELF="`basename "$0"`"

# default configuration
VAULT_CSS="vault.css"
VAULT_INDEX="vault"
VAULT_SCRIPT="vault"
VAULT_SCRIPT_EXT=".js"
VAULT_INDEX_EXT=".html"
VAULT_DOMAIN="vault.ashenm.ml"

# output colors
ANSI_GREEN="\033[32;1m"
ANSI_YELLOW="\033[33;1m"
ANSI_BLUE="\033[34;1m"
ANSI_RESET="\033[0m"

# parse arguments
while [ $# -ne 0 ]
do

  case "$1" in

    --css)
      VAULT_CSS="${2:?Invalid CSS}"
      shift 2
      ;;

    --index)
      VAULT_INDEX="${2:?Invalid INDEX}"
      shift 2
      ;;

    --script)
      VAULT_SCRIPT="${2:?Invalid SCRIPT}"
      shift 2
      ;;

    --domain)
      VAULT_DOMAIN="${2:?Invalid DOMAIN}"
      shift 2
      ;;

    --index-ext)
      VAULT_INDEX_EXT="${2:?Invalid EXTENSION}"
      shift 2
      ;;

    --script-ext)
      VAULT_SCRIPT_EXT="${2:?Invalid EXTENSION}"
      shift 2
      ;;

    --zone)
      VAULT_ZONE="${2:?Invalid ZONE}"
      shift 2
      ;;

    -h|--help)
      usage
      exit 0
      ;;

    -*|--*)
      invalid "$1"
      exit 1
      ;;

    minify)
      minify
      exit 0
      ;;

    purge)
      purge
      exit 0
      ;;

    *)
      invalid "$1"
      exit 1
      ;;

  esac

done

# print usage instructions
# if no action invoked
usage

