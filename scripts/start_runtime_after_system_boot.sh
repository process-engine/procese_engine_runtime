#!/bin/sh

_VERSION="0.0.1"

# This script will install and use pm2.
# We want to register the process-engine-runtime as service,
# that ist started during system startup.

if [[ $(uname) != "Darwin" ]]; then
    echo "This tool currently works only for macOS. Sorry."
    exit -1
fi

# check if pm2 is already installed
PM2_NOT_INSTALLED=$(npm -g ls | grep pm2)

if [[ -z $PM2_NOT_INSTALLED ]]; then
    npm install -g pm2
fi

# TODO: Replace this by: pm2 start process_engine_runtime; when this package is published.
pm2 start ./index.js

STARTUP_REGISTRATION_COMMAND=$(pm2 startup | grep -v "\[PM2\]")

eval $STARTUP_REGISTRATION_COMMAND

# Persist the process list after restart
pm2 save -f
