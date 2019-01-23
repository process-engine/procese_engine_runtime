import * as fs from 'fs';
import * as path from 'path';

let httpExtension: any;
let routeConfiguration: any;

const httpSuccessCode: Number = 200;

// tslint:disable:no-magic-numbers
export async function configureGlobalRoutes(container: any): Promise<void> {
  httpExtension = await container.resolveAsync('HttpExtension');
  routeConfiguration = loadConfig('http', 'global_routes');

  configureRootRoute();
  configureAuthorityRoute();
}

function configureRootRoute(): void {
  const packageInfo: any = getInfosFromPackageJson();

  const formattedResponse: string = JSON.stringify(packageInfo, null, 2);

  httpExtension.app.get('/', (request: any, response: any) => {
    response
      .status(httpSuccessCode)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function configureAuthorityRoute(): void {
  const iamConfig: any = loadConfig('iam', 'iam_service');
  const authorityRoute: string = routeConfiguration.authority;

  const responseBody: any = {
    authority: iamConfig.basePath,
  };

  const formattedResponse: string = JSON.stringify(responseBody, null, 2);

  httpExtension.app.get(authorityRoute, (request: any, response: any): void => {
    response
      .status(httpSuccessCode)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function loadConfig(configDirName: string, configFileName: string): any {
  const configPath: string = path.join(process.cwd(), 'config', process.env.NODE_ENV, configDirName, `${configFileName}.json`);

  // eslint-disable-next-line global-require
  const loadedConfig: any = require(configPath);

  return loadedConfig;
}

function getInfosFromPackageJson(): any {

  const configPath: string = path.join(process.cwd(), `package.json`);

  const packageJsonContentRaw: string = fs.readFileSync(configPath, 'utf-8');
  const packageJson: any = JSON.parse(packageJsonContentRaw);

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

  const applicationInfo: any = {
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
