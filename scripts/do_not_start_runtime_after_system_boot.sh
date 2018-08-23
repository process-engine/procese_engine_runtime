#!/bin/sh

_VERSION="0.0.1"

# This script will install and use pm2.
# We want to register the process-engine-runtime as service,
# that ist started during system startup.

if [[ $(uname) != "Darwin" ]]; then
    echo "This tool currently works only for macOS. Sorry."
    exit -1
fi

# Due to a bug in pm2, the macOS-Version does not support the removal of started processes.
# Ref: https://github.com/Unitech/pm2/issues/1349 and https://github.com/Unitech/pm2/issues/3732
cat << EOF
There is a bug in pm2, that prevents us from cleanly removing the process-engine-runtime from the autostart list of your system."

You can try to delete the pm2 launch agent, but this will likely remove ALL of your services from the autostart list.

Anyway, this could help you:

$ rm ~/Library/LaunchAgents/pm2.*

We're sorry for that, and will fix it as soon as it is fixed in pm2.

The ProccessEngine Team.
EOF
