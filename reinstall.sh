# remove "node_modules"
echo "Purging node_modules..."
find . -name "node_modules" -exec rm -rf '{}' +
echo "Done. Starting setup..."

echo "Clearing npm cache"
npm cache clean --force

# install all necessary dependencies
echo "Running npm install"
rm package-lock.json
npm install

if [[ "$?" -ne "0" ]]; then
  printf "\e[1;31mNPM install failed! Aborting...\e[0m\n";
  exit 1;
fi

# build all packages
echo "Building solution"
npm run build

echo "done"
