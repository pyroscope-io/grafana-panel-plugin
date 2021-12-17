#!/usr/bin/env bash

set -euo pipefail

cloneDst="pyroscope"

################
# Build Plugin #
################
rm -Rf dist/
rm -Rf "$cloneDst"

git clone --depth 1 --branch "chore/grafana-panel-webpack" https://github.com/pyroscope-io/pyroscope.git "$cloneDst"


# https://github.com/typicode/husky/issues/851
# 'husky install' fails since there's no git
sed -i '/"prepare"/d' "$cloneDst/package.json"

# install dependencies
yarn --cwd "$cloneDst"


# build panel
yarn --cwd "$cloneDst" build:panel

cp -r "$cloneDst/grafana-plugin/panel/dist" dist/

################
# Add metadata #
################
cp CHANGELOG.md dist/
cp README.md dist/
cp LICENSE dist/
