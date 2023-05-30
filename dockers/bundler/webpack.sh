#!/bin/bash -e

# This script generates the `dist/bundler.js` file which is consumed by the Dockerfile.

cd `cd \`dirname $0\`;pwd`

#need to preprocess first to have the Version.js
test -z $NOBUILD && yarn preprocess

test -z "$VERSION" && VERSION=`jq -r .version ../../packages/utils/package.json`
echo version=$VERSION

# Only rebuild when there is a newer src file:
find ./webpack.sh ../../packages/*/src/ -type f -newer dist/bundler.js 2>&1 | head -2 | grep  . && {
	echo webpacking..
	npx webpack
}