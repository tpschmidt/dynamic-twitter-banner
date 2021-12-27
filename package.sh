#!/usr/bin/env bash

set -e

rm -rf deploy
mkdir deploy

# packaging lambda
zip -rq deploy/lambda.zip *.js assets/*

# packaging layer
mkdir -p deploy
rm -rf tmp/common
mkdir -p tmp/common/nodejs
cp package.json tmp/common/nodejs
pushd tmp/common/nodejs 2>&1>/dev/null
  docker run --platform linux/amd64 -v "$PWD":/var/task lambci/lambda:build-nodejs12.x npm install --no-optional --only=prod
popd 2>&1>/dev/null
pushd tmp/common 2>&1>/dev/null
    rm nodejs/package.json
    zip -r ../../deploy/layer-common.zip . 2>&1>/dev/null
popd 2>&1>/dev/null
if [[ ! -f deploy/layer-common.zip ]];then
    echo "Packaging failed! Distribution package ZIP file could not be found."
    exit 1
fi
