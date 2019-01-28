import {InvocationContainer} from 'addict-ioc';
import {Request, Response} from 'express';
import * as fs from 'fs';
import * as path from 'path';

import {IHttpExtension} from '@essential-projects/http_contracts';

let httpExtension: IHttpExtension;

const httpStatusCodeSuccess: number = 200;
const authorityRoute: string = '/security/authority';

interface IApplicationInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  author: string;
  contributors: string;
  repository: string;
  bugs: string;
}

export async function configureGlobalRoutes(container: InvocationContainer): Promise<void> {
  httpExtension = await container.resolveAsync<IHttpExtension>('HttpExtension');

  configureRootRoute();
  configureAuthorityRoute();
}

function configureRootRoute(): void {
  const packageInfo: any = getInfosFromPackageJson();

  // tslint:disable-next-line:no-magic-numbers
  const formattedResponse: string = JSON.stringify(packageInfo, null, 2);

  httpExtension.app.get('/', (request: Request, response: Response) => {
    response
      .status(httpStatusCodeSuccess)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function configureAuthorityRoute(): void {
  const iamConfig: any = loadConfig('iam', 'iam_service');

  const responseBody: any = {
    authority: iamConfig.basePath,
  };

  // tslint:disable-next-line:no-magic-numbers
  const formattedResponse: string = JSON.stringify(responseBody, null, 2);

  httpExtension.app.get(authorityRoute, (request: Request, response: Response) => {
    response
      .status(httpStatusCodeSuccess)
      .header('Content-Type', 'application/json')
      .send(formattedResponse);
  });
}

function loadConfig(configDirName: string, configFileName: string): any {

  const baseConfigPath: string = process.env.CONFIG_PATH && path.isAbsolute(process.env.CONFIG_PATH)
    ? process.env.CONFIG_PATH
    : path.join(process.cwd(), 'config');

  const configPath: string = path.join(baseConfigPath, process.env.NODE_ENV, configDirName, `${configFileName}.json`);

  // eslint-disable-next-line global-require
  const loadedConfig: any = require(configPath);

  return loadedConfig;
}

function getInfosFromPackageJson(): any {

  const pathToPackageJson: string = path.join(__dirname, '..', '..', 'package.json');
  const packageJsonAsString: string = fs.readFileSync(pathToPackageJson, 'utf-8');

  const packageJson: IApplicationInfo = JSON.parse(packageJsonAsString);

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

  const applicationInfo: IApplicationInfo = {
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
