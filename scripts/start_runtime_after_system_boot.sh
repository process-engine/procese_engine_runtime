#!/bin/sh

_VERSION="0.0.1"

# This script will install and use pm2.
# We want to register the process-engine-runtime as service,
# that ist started during system startup.

# NOTE: The version for windows systems will look something like "MINGW64_NT-10.0", depending on the version of windows used.
os_version="$(uname)"

if [ os_version == "Darwin" ]; then
    setup_macos()
elif [ os_version == MINGW* ]; then
    setup_windows()
else
    echo "This tool currently works only for macOS and windows. Sorry."
fi

function setup_macos {

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
}

function setup_windows {
  # check if pm2-windows-service is already installed
  PM2_WINDOWS_NOT_INSTALLED=$(npm -g ls | grep pm2-windows-service)

  if [[ -z $PM2_WINDOWS_NOT_INSTALLED ]]; then
      npm install -g pm2-windows-service
  fi

  pm2-service-install

  # TODO: Replace this by: pm2 start process_engine_runtime; when this package is published.
  pm2 start ./index.js

  STARTUP_REGISTRATION_COMMAND=$(pm2 startup | grep -v "\[PM2\]")

  eval $STARTUP_REGISTRATION_COMMAND

  # Persist the process list after restart
  pm2 save -f
}
