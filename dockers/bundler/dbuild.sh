#!/bin/bash -e

# run webpack in case there are code changes.
sh ./run_webpack.sh

docker build -t $IMAGE .
docker tag $IMAGE $IMAGE:$VERSION
echo "== To publish"
echo "   docker push $IMAGE:latest; docker push $IMAGE:$VERSION"

AMD64_IMAGE=$IMAGE-amd64
docker build --platform linux/amd64 -t $AMD64_IMAGE .
docker tag $AMD64_IMAGE $AMD64_IMAGE:$VERSION
echo "== To publish"
echo "   docker push $AMD64_IMAGE:latest; docker push $AMD64_IMAGE:$VERSION"