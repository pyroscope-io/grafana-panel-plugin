#!/usr/bin/env bash

set -euo pipefail

UPSTREAM_BRANCH="chore/grafana-panel-webpack"
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')


cloneDst="pyroscope"

################
# Build Plugin #
################
rm -Rf dist/
rm -Rf "$cloneDst"

git clone --depth 1 --branch "$UPSTREAM_BRANCH" https://github.com/pyroscope-io/pyroscope.git "$cloneDst"


# https://github.com/typicode/husky/issues/851
# 'husky install' fails since there's no git
sed -i '/"prepare"/d' "$cloneDst/package.json"

# install dependencies
yarn --cwd "$cloneDst"


# build panel
PYROSCOPE_PANEL_VERSION="$PACKAGE_VERSION"
yarn --cwd "$cloneDst" build:panel

cp -r "$cloneDst/grafana-plugin/panel/dist" dist

################
# Add metadata #
################
cp CHANGELOG.md dist/
