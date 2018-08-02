npm install -g pm2

# pm2 start ./index.js

# pm2 save

# startupRegistrationCommand = pm2 startup | grep "^sudo"

echo $USER

# sudo env PATH=$PATH:/Users/$USER/.nvm/versions/node/v8.9.4/bin /Users/$USER/.nvm/versions/node/v8.9.4/lib/node_modules/pm2/bin/pm2 startup launchd -u $USER --hp /Users/$USER