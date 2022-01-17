#!/usr/bin/env bash

set -euo pipefail

UPSTREAM_COMMIT="b30c01e72f7f26fb4494fb7dcab233dd4968095c"
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

cloneDst="pyroscope"

################
# Build Plugin #
################
rm -Rf dist/
rm -Rf "$cloneDst"

#git clone --depth 1 --branch "$UPSTREAM_BRANCH" https://github.com/pyroscope-io/pyroscope.git "$cloneDst"
git clone --depth 1 --branch "main" https://github.com/pyroscope-io/pyroscope.git "$cloneDst"
git -C "$cloneDst" checkout "$UPSTREAM_COMMIT"



# https://github.com/typicode/husky/issues/851
# 'husky install' fails since there's no git
sed -i '/"prepare"/d' "$cloneDst/package.json"

# install dependencies
yarn --cwd "$cloneDst"


# build panel
export PYROSCOPE_PANEL_VERSION="$PACKAGE_VERSION"
yarn --cwd "$cloneDst" build:panel

cp -r "$cloneDst/grafana-plugin/panel/dist" dist

################
# Add metadata #
################
cp CHANGELOG.md dist/
