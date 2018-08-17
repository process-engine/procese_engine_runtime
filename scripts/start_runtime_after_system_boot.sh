# We want to register the process-engine-runtime as service,
# that ist started during system startup.

# NOTE: The version for windows systems will look something like "MINGW64_NT-10.0", depending on the version of windows used.
os_version="$(uname)"

function setup_macos {

  echo "Performing mac os setup"

  # check if pm2 is already installed
  PM2_NOT_INSTALLED=$(npm -g ls | grep pm2)

  if [[ -z $PM2_NOT_INSTALLED ]]; then
      echo "installing pm2"
      npm install -g pm2
  fi

  echo "starting up..."

  # TODO: Replace this by: pm2 start process_engine_runtime; when this package is published.
  pm2 start ./index.js

  STARTUP_REGISTRATION_COMMAND=$(pm2 startup | grep -v "\[PM2\]")

  eval $STARTUP_REGISTRATION_COMMAND

  echo "persisting"

  # Persist the process list after restart
  pm2 save -f

  echo "done!"
  exit 0
}

function setup_windows {

  echo "Performing windows setup"

  # check if pm2-windows-service is already installed
  PM2_WINDOWS_NOT_INSTALLED=$(npm -g ls | grep pm2-windows-service)

  if [[ -z $PM2_WINDOWS_NOT_INSTALLED ]]; then
      echo "installing pm2-windows-service"
      npm install -g pm2-windows-service
  fi

  echo "installing pm2"

  pm2-service-install

  echo "starting up"

  # TODO: Replace this by: pm2 start process_engine_runtime; when this package is published.
  pm2 start ./index.js

  STARTUP_REGISTRATION_COMMAND=$(pm2 startup | grep -v "\[PM2\]")

  eval $STARTUP_REGISTRATION_COMMAND

  echo "persisting"

  # Persist the process list after restart
  pm2 save -f

  echo "done!"
  exit 0
}

if [[ os_version == "Darwin" ]]; then
    setup_macos
elif [[ "$os_version" =~ ^MINGW.* ]]; then
    setup_windows
else
    echo "This tool currently works only for macOS and windows. Sorry."
fi
