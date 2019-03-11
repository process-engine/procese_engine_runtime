'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports.initialize = (sqlitePath) => {

  setConfigPath();
  loadConfiguredEnvironmentOrDefault();

  const userDataFolderPath = getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';

  const workingDir = path.join(userDataFolderPath, userDataProcessEngineFolderName);

  if (!fs.existsSync(workingDir)) {
    fs.mkdirSync(workingDir);
  }

  setDatabasePaths(sqlitePath);
};

function setConfigPath() {

  const configPathProvided = process.env.CONFIG_PATH !== undefined;
  if (configPathProvided) {

    const configPathIsAbsolute = path.isAbsolute(process.env.CONFIG_PATH);
    if (configPathIsAbsolute) {
      return;
    }
  }

  const internalConfigFolderName = 'config';
  const internalConfigPath = path.join(__dirname, '..', '..', '..', internalConfigFolderName);

  process.env.CONFIG_PATH = internalConfigPath;
}

function loadConfiguredEnvironmentOrDefault() {

  const configEnvironment = 'sqlite';

  let configDirNameNormalized = path.normalize(process.env.CONFIG_PATH);

  // If the runtime is run within the BPMN studio, electron will place it in `app.asar`.
  // We must account for that fact here, or we won't be able to correctly initialize the runtimes environment.
  const appAsarPathPart = path.normalize(path.join('.', 'app.asar'));

  if (configDirNameNormalized.includes('app.asar')) {
    configDirNameNormalized = configDirNameNormalized.replace(appAsarPathPart, '');
  }

  const configPath = path.join(configDirNameNormalized, configEnvironment);

  const isEnvironmentAvailable = fs.existsSync(configPath);
  if (isEnvironmentAvailable) {
    return;
  }

  console.error(`Config at ${configPath} is not available!`);
  process.exit(1);
}

function setDatabasePaths(sqlitePath) {

  const correlationRepositoryConfig = readConfigFile('sqlite', 'correlation_repository.json');
  const externalTaskRepositoryConfig = readConfigFile('sqlite', 'external_task_repository.json');
  const flowNodeInstanceRepositoryConfig = readConfigFile('sqlite', 'flow_node_instance_repository.json');
  const processModelRepositoryConfig = readConfigFile('sqlite', 'process_model_repository.json');

  const databaseBasePath = getSqliteStoragePath(sqlitePath);

  const correlationRepositoryStoragePath = path.join(databaseBasePath, correlationRepositoryConfig.storage);
  const externalTaskRepositoryStoragePath = path.join(databaseBasePath, externalTaskRepositoryConfig.storage);
  const flowNodeRepositoryStoragePath = path.join(databaseBasePath, flowNodeInstanceRepositoryConfig.storage);
  const processModelRepositoryStoragePath = path.join(databaseBasePath, processModelRepositoryConfig.storage);

  process.env.process_engine__correlation_repository__storage = correlationRepositoryStoragePath;
  process.env.process_engine__external_task_repository__storage = externalTaskRepositoryStoragePath;
  process.env.process_engine__process_model_repository__storage = processModelRepositoryStoragePath;
  process.env.process_engine__flow_node_instance_repository__storage = flowNodeRepositoryStoragePath;
}

function getSqliteStoragePath(sqlitePath) {

  if (sqlitePath) {
    return sqlitePath;
  }

  const userDataFolderPath = getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

function getUserConfigFolder() {

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

function readConfigFile(env, repositoryConfigFileName) {

  const configFilePath = path.resolve(process.env.CONFIG_PATH, env, 'process_engine', repositoryConfigFileName);

  const fileContent = fs.readFileSync(configFilePath, 'utf-8');

  const parsedFileContent = JSON.parse(fileContent);

  return parsedFileContent;
}

module.exports.readConfigFile = readConfigFile;
