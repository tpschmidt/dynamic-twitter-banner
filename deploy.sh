#!/usr/bin/env bash

set -e

zip -rq deploy/lambda.zip *.js assets/*
sls deploy function -f twitterBanner
sls invoke -f twitterBanner