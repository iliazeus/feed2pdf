#!/bin/bash

set -e

esbuild \
  --bundle --sourcemap=inline --minify --keep-names --charset=utf8 \
  --platform=node --banner:js="#!/usr/bin/env node" \
  ./src/cli.ts \
  --outfile=./dist/feed2pdf.js
