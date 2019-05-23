import {InvocationContainer} from 'addict-ioc';
import {Request, Response} from 'express';
import * as fs from 'fs';
import * as path from 'path';

import {IHttpExtension} from '@essential-projects/http_contracts';

let httpExtension: IHttpExtension;

const httpStatusCodeSuccess = 200;
const authorityRoute = '/security/authority';

interface IApplicationInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  author: string | object;
  contributors: Array<string>;
  repository: string | object;
  bugs: string | object;
}

export async function configureGlobalRoutes(container: InvocationContainer): Promise<void> {
  httpExtension = await container.resolveAsync<IHttpExtension>('HttpExtension');

  configureRootRoute();
  configureAuthorityRoute();
}

function configureRootRoute(): void {
  const packageInfo = getInfosFromPackageJson();

  const formattedResponse = JSON.stringify(packageInfo, undefined, 2);

  httpExtension.app.get('/', (request: Request, response: Response): void => {
    response
      .status(httpStatusCodeSuccess)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function configureAuthorityRoute(): void {
  const iamConfig = loadConfig('iam', 'iam_service');

  const responseBody = {
    authority: process.env.iam__iam_service__basePath || iamConfig.basePath,
  };

  const formattedResponse = JSON.stringify(responseBody, undefined, 2);

  httpExtension.app.get(authorityRoute, (request: Request, response: Response): void => {
    response
      .status(httpStatusCodeSuccess)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function loadConfig(configDirName: string, configFileName: string): any {

  const baseConfigPath = process.env.CONFIG_PATH && path.isAbsolute(process.env.CONFIG_PATH)
    ? process.env.CONFIG_PATH
    : path.join(process.cwd(), 'config');

  const configPath = path.join(baseConfigPath, process.env.NODE_ENV, configDirName, `${configFileName}.json`);

  // eslint-disable-next-line
  const loadedConfig = require(configPath);

  return loadedConfig;
}

function getInfosFromPackageJson(): IApplicationInfo {

  const pathToPackageJson = path.join(__dirname, '..', '..', 'package.json');
  const packageJsonAsString = fs.readFileSync(pathToPackageJson, 'utf-8');

  const packageJson = JSON.parse(packageJsonAsString);

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
