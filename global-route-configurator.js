'use strict';

const path = require('path');
const packageJson = require('./package.json');

module.exports = {
  configureGlobalRoutes: configureGlobalRoutes,
};

async function configureGlobalRoutes(container) {
  const httpExtension = await container.resolveAsync('HttpExtension');
  const routeConfiguration = loadConfigJson('http', 'global_route_configuration');

  configureRootRoute(httpExtension);
  configureAuthorityRoute(httpExtension, routeConfiguration);
}

function configureRootRoute(httpExtension) {
  httpExtension.app.get('/', (request, response) => {

    const packageInfo = getInfosFromPackageJson();

    response
      .status(200)
      .header('Content-Type', 'application/json')
      .send(JSON.stringify(packageInfo, null, 2));
  });
}

function configureAuthorityRoute(httpExtension, routeConfiguration) {
  const iamConfig = loadConfigJson('iam', 'iam_service');
  const authorityRoute = routeConfiguration.authority ? routeConfiguration.authority : '/authority';

  httpExtension.app.get('/authority', (request, response) => {
    response
      .status(200)
      .header('Content-Type', 'application/json')
      .send(JSON.stringify(iamConfig, null, 2));
  });
}

function loadConfigJson(configDirName, configFileName) {
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
