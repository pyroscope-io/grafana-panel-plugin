#!/usr/bin/env bash

set -euo pipefail

################
# Build Plugin #
################
rm -Rf dist/

# https://github.com/typicode/husky/issues/851
# 'husky install' fails since there's no git
sed -i '/"prepare"/d' node_modules/pyroscope/package.json

# install dependencies
yarn --cwd node_modules/pyroscope


# build panel
yarn --cwd node_modules/pyroscope build:panel

cp -r node_modules/pyroscope/grafana-plugin/panel/dist dist/

################
# Add metadata #
################
cp CHANGELOG.md dist/
cp README.md dist/
cp LICENSE dist/
