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
Run a workspace in a new container

Options:
      --bucket NAME         S3 Bucket (default 'vault.ashenm.ml')
      --distribution ID     CloudFront distribution ID
      --domain DOMAIN       S3Vault domain (default <S3 Bucket Name>)
      --folder FOLDER       S3 Folder (default '__public__')
  -h, --help                Print usage
      --index FILENAME      Index document (default 'vault')
      --index-ext EXT       Index document extension (default '.html')
      --no-compile          Skip resource minification
      --no-upload           Skip resource S3 upload
      --script FILENAME     JavaScript file (default 'vault')
      --script-index EXT    JavaScript file extension (default '.js')
      --zone ID             CloudFlare Zone ID

Action:
  deploy                    Deploy S3Vault
  minify                    Minify resource files

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
    > "$VAULT_SCRIPT.min.js"

  echo "${ANSI_GREEN}SUCCESS Minifying JavaScript resources${ANSI_RESET}"

  # TODO minify html

}

#######################################
# Build and Deploy S3Vault
# Arguments:
#   None
# Returns:
#   None
#######################################
deploy () {

  # minify resources
  test "$VAULT_COMPILE" || \
    minify

  # upload S3 artifacts
  test "$VAULT_UPLOAD" || \
    aws s3 cp --recursive \
      --exclude "*" \
      --storage-class "STANDARD_IA" \
      --include "$VAULT_SCRIPT.min.js" \
      --include "$VAULT_INDEX$VAULT_INDEX_EXT" \
      . "s3://$VAULT_BUCKET/$VAULT_FOLDER/" \
    1> /dev/null && echo "${ANSI_GREEN}SUCCESS Uploading artifacts to S3${ANSI_RESET}"

  # invalidate CloudFront caches
  test "$VAULT_DISTRIBUTION" && \
    aws cloudfront create-invalidation \
      --distribution-id "$VAULT_DISTRIBUTION" \
      --paths "/$VAULT_INDEX$VAULT_INDEX_EXT" "/$VAULT_SCRIPT.min.js" \
    1> /dev/null && \

  # await CloudFront invalidation
  # TEMP until CloudFlare supports scheduled cache purging
  while [ $VAULT_DISTRIBUTION_TIMEOUT -gt 0 ]
  do

    # interact STDOUT throughout
    echo "${ANSI_YELLOW}INFO Invalidating CloudFront caches${ANSI_RESET}"

    # sleep no more than 10m
    # to avoid non-interaction
    sleep 300

    # decrement desired timeout
    VAULT_DISTRIBUTION_TIMEOUT=$(( $VAULT_DISTRIBUTION_TIMEOUT - 300 ))

  done

  echo "${ANSI_GREEN}SUCCESS Invalidating CloudFront caches${ANSI_RESET}"

  # purge CloudFlare Edge caches
  # https://api.cloudflare.com/#zone-purge-files-by-url
  test "$VAULT_ZONE" && \
    curl --silent \
      --show-error \
      --request POST \
      --output /dev/null \
      --header "X-Auth-Key: $CLOUDFLARE_TOKEN" \
      --header "X-Auth-Email: $CLOUDFLARE_USER" \
      --header "Content-Type: application/json" \
      --data "{ \"files\": [ \"https://$VAULT_DOMAIN/$VAULT_INDEX$VAULT_INDEX_EXT\", \"https://$VAULT_DOMAIN/$VAULT_SCRIPT.min.js\" ] }" \
      --url "https://api.cloudflare.com/client/v4/zones/$VAULT_ZONE/purge_cache" \
    && echo "${ANSI_GREEN}SUCCESS Purging CloudFlare Edge caches${ANSI_RESET}"

}

# script reference
SELF="`basename "$0"`"

# default configuration
VAULT_INDEX="vault"
VAULT_SCRIPT="vault"
VAULT_SCRIPT_EXT=".js"
VAULT_INDEX_EXT=".html"
VAULT_BUCKET="vault.ashenm.ml"
VAULT_FOLDER="__public__"

# S3Vault domain
VAULT_DOMAIN="$VAULT_BUCKET"

# CloudFront invalidation grace period
VAULT_DISTRIBUTION_TIMEOUT=900

# output colors
ANSI_GREEN="\033[32;1m"
ANSI_YELLOW="\033[33;1m"
ANSI_BLUE="\033[34;1m"
ANSI_RESET="\033[0m"

# parse arguments
while [ $# -ne 0 ]
do

  case "$1" in

    --no-upload)
      VAULT_UPLOAD="FALSE"
      shift
      ;;

    --no-compile)
      VAULT_COMPILE="FALSE"
      shift
      ;;

    --index)
      VAULT_INDEX="${2:?Invalid INDEX}"
      shift 2
      ;;

    --script)
      VAULT_SCRIPT="${2:?Invalid SCRIPT}"
      shift 2
      ;;

    --bucket)
      VAULT_BUCKET="${2:?Invalid BUCKET}"
      shift 2
      ;;

    --folder)
      VAULT_FOLDER="${2:?Invalid FOLDER}"
      shift 2
      ;;

    --domain)
      VAULT_DOMAIN="${2:?Invalid DOMAIN}"
      shift 2
      ;;

    --distribution)
      VAULT_DISTRIBUTION="${2:?Invalid DISTRIBUTION}"
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

    deploy)
      deploy
      exit 0
      ;;

    minify)
      minify
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

