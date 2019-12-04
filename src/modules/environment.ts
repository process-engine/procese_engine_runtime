/* eslint-disable @typescript-eslint/camelcase */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as Sequelize from 'sequelize';

export function setDatabasePaths(sqlitePath: string): void {

  const correlationRepositoryConfig = readConfigFile('sqlite', 'correlation_repository.json');
  const externalTaskRepositoryConfig = readConfigFile('sqlite', 'external_task_repository.json');
  const flowNodeInstanceRepositoryConfig = readConfigFile('sqlite', 'flow_node_instance_repository.json');
  const processModelRepositoryConfig = readConfigFile('sqlite', 'process_model_repository.json');

  const databaseBasePath = getSqliteStoragePath(sqlitePath);

  const correlationRepositoryStoragePath = path.join(databaseBasePath, correlationRepositoryConfig.storage);
  const externalTaskRepositoryStoragePath = path.join(databaseBasePath, externalTaskRepositoryConfig.storage);
  const flowNodeRepositoryStoragePath = path.join(databaseBasePath, flowNodeInstanceRepositoryConfig.storage);
  const processModelRepositoryStoragePath = path.join(databaseBasePath, processModelRepositoryConfig.storage);

  const logsStoragePath = path.join(databaseBasePath, 'logs');

  process.env.process_engine__correlation_repository__storage = correlationRepositoryStoragePath;
  process.env.process_engine__external_task_repository__storage = externalTaskRepositoryStoragePath;
  process.env.process_engine__process_model_repository__storage = processModelRepositoryStoragePath;
  process.env.process_engine__flow_node_instance_repository__storage = flowNodeRepositoryStoragePath;

  process.env.process_engine__logging_repository__log_output_path = logsStoragePath;
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
