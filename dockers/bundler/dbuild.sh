#!/bin/bash -e
cd `cd \`dirname $0\`;pwd`

#need to preprocess first to have the Version.js
test -z $NOBUILD && yarn preprocess

test -z "$VERSION" && VERSION=`jq -r .version ../../packages/utils/package.json`
echo version=$VERSION

IMAGE=skypigr/bundler

#build docker image of bundler
#rebuild if there is a newer src file:
find ./dbuild.sh ../../packages/*/src/ -type f -newer dist/bundler.js 2>&1 | head -2 | grep  . && {
	echo webpacking..
	npx webpack
}

docker build -t $IMAGE .
docker tag $IMAGE $IMAGE:$VERSION
echo "== To publish"
echo "   docker push $IMAGE:latest; docker push $IMAGE:$VERSION"

AMD64_IMAGE=$IMAGE-amd64
docker build --platform linux/amd64 -t $AMD64_IMAGE .
docker tag $AMD64_IMAGE $AMD64_IMAGE:$VERSION
echo "== To publish"
echo "   docker push $AMD64_IMAGE:latest; docker push $AMD64_IMAGE:$VERSION"