#!/bin/sh
exec node `dirname $0`/bundler.js --unsafe "$@"
