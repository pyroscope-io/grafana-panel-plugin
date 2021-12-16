#!/usr/bin/env bash

set -euo pipefail

################
# Build Plugin #
################
rm -Rf dist/

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
