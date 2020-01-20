/* eslint-disable @typescript-eslint/camelcase */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as Sequelize from 'sequelize';

export interface IApplicationInfo {
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

export function setDatabasePaths(sqlitePath: string): void {

  const databaseBasePath = getSqliteStoragePath(sqlitePath);

  const logsStoragePath = path.join(databaseBasePath, 'logs');
  process.env.process_engine__logging_repository__log_output_path = logsStoragePath;

  const correlationRepositoryConfig = readConfigFile(process.env.NODE_ENV, 'correlation_repository.json');
  if (correlationRepositoryConfig.storage) {
    const correlationRepositoryStoragePath = path.join(databaseBasePath, correlationRepositoryConfig.storage);
    process.env.process_engine__correlation_repository__storage = correlationRepositoryStoragePath;
  }

  const externalTaskRepositoryConfig = readConfigFile(process.env.NODE_ENV, 'external_task_repository.json');
  if (externalTaskRepositoryConfig.storage) {
    const externalTaskRepositoryStoragePath = path.join(databaseBasePath, externalTaskRepositoryConfig.storage);
    process.env.process_engine__external_task_repository__storage = externalTaskRepositoryStoragePath;
  }

  const flowNodeInstanceRepositoryConfig = readConfigFile(process.env.NODE_ENV, 'flow_node_instance_repository.json');
  if (flowNodeInstanceRepositoryConfig.storage) {
    const flowNodeRepositoryStoragePath = path.join(databaseBasePath, flowNodeInstanceRepositoryConfig.storage);
    process.env.process_engine__flow_node_instance_repository__storage = flowNodeRepositoryStoragePath;
  }

  const processModelRepositoryConfig = readConfigFile(process.env.NODE_ENV, 'process_model_repository.json');
  if (processModelRepositoryConfig.storage) {
    const processModelRepositoryStoragePath = path.join(databaseBasePath, processModelRepositoryConfig.storage);
    process.env.process_engine__process_model_repository__storage = processModelRepositoryStoragePath;
  }
}

export function getSqliteStoragePath(sqlitePath?: string): string {

  if (sqlitePath) {
    return sqlitePath;
  }

  const userDataFolderPath = getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

export function getUserConfigFolder(): string {

  const userHomeDir = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(userHomeDir, 'Library', 'Application Support');
    case 'win32':
      return path.join(userHomeDir, 'AppData', 'Roaming');
    default:
      return path.join(userHomeDir, '.config');
  }
}

export function readConfigFile(env: string, repositoryConfigFileName: string): Sequelize.Options {

  const configFilePath = path.resolve(process.env.CONFIG_PATH, env, 'process_engine', repositoryConfigFileName);

  const fileContent = fs.readFileSync(configFilePath, 'utf-8');

  const parsedFileContent = JSON.parse(fileContent) as Sequelize.Options;

  return parsedFileContent;
}

export function readPackageJson(): IApplicationInfo {

  const pathToPackageJson = path.join(__dirname, '..', '..', '..', 'package.json');
  const packageJsonAsString = fs.readFileSync(pathToPackageJson, 'utf-8');

  const packageJson = JSON.parse(packageJsonAsString);

  return packageJson;
}
