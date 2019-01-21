'use strict';

const path = require('path');
const packageJson = require('./package.json');

let httpExtension;
let routeConfiguration;

module.exports = async (container) => {
  httpExtension = await container.resolveAsync('HttpExtension');
  routeConfiguration = loadConfig('http', 'global_routes');

  configureRootRoute();
  configureAuthorityRoute();
};

function configureRootRoute() {
  const packageInfo = getInfosFromPackageJson();

  const formattedResponse = JSON.stringify(packageInfo, null, 2);

  httpExtension.app.get('/', (request, response) => {
    response
      .status(200)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function configureAuthorityRoute() {
  const iamConfig = loadConfig('iam', 'iam_service');
  const authorityRoute = routeConfiguration.authority;

  const responseBody = {
    authority: iamConfig.basePath,
  };

  const formattedResponse = JSON.stringify(responseBody, null, 2);

  httpExtension.app.get(authorityRoute, (request, response) => {
    response
      .status(200)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function loadConfig(configDirName, configFileName) {
  const configPath = path.join(process.env.CONFIG_PATH, process.env.NODE_ENV, configDirName, `${configFileName}.json`);

  // eslint-disable-next-line global-require
  const loadedConfig = require(configPath);

  return loadedConfig;
}

function getInfosFromPackageJson() {

  const {
    name,
    version,
    description,
    license,
    homepage,
    author,
    contributors,
    repository,
    bugs,
  } = packageJson;

  const applicationInfo = {
    name: name,
    version: version,
    description: description,
    license: license,
    homepage: homepage,
    author: author,
    contributors: contributors,
    repository: repository,
    bugs: bugs,
  };

  return applicationInfo;
}
