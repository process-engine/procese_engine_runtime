'use strict';

const Bluebird = require('bluebird');

Bluebird.config({
  cancellation: true,
});

global.Promise = Bluebird;

const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');

const badgeInfo = chalk.blueBright('Info: ');
const badgeWarn = chalk.yellow('Warn: ');
const badgeErr = chalk.red('Error: ');

module.exports.badges = {
  Info: badgeInfo,
  Warn: badgeWarn,
  Error: badgeErr,
}

module.exports.initialize = () => {

  const configEnvironment = process.env.NODE_ENV || 'sqlite';

  setConfigPath();
  validateEnvironmentConfiguration(configEnvironment);

  const userDataFolderPath = getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';

  const workingDir = path.join(userDataFolderPath, userDataProcessEngineFolderName);

  if (!fs.existsSync(workingDir)) {
    fs.mkdirSync(workingDir);
  }

  const envIsSqlite = configEnvironment === 'sqlite';
  if (envIsSqlite) {
    const sqliteStorageLocation = getSqliteStorageLocation(process.env.SQLITE_STORAGE_PATH);
    setSqliteDatabasePaths(sqliteStorageLocation);
  }
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

function validateEnvironmentConfiguration(configEnvironment) {

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

function getSqliteStorageLocation(basePath) {

  if (basePath) {
    return basePath;
  }

  const userDataFolderPath = getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

function setSqliteDatabasePaths(sqliteStoreLocation) {

  const correlationRepositoryConfig = readConfigFile('sqlite', 'correlation_repository.json');
  const externalTaskRepositoryConfig = readConfigFile('sqlite', 'external_task_repository.json');
  const flowNodeInstanceRepositoryConfig = readConfigFile('sqlite', 'flow_node_instance_repository.json');
  const processModelRepositoryConfig = readConfigFile('sqlite', 'process_model_repository.json');

  const correlationRepositoryStoragePath = path.join(sqliteStoreLocation, correlationRepositoryConfig.storage);
  const externalTaskRepositoryStoragePath = path.join(sqliteStoreLocation, externalTaskRepositoryConfig.storage);
  const flowNodeRepositoryStoragePath = path.join(sqliteStoreLocation, flowNodeInstanceRepositoryConfig.storage);
  const processModelRepositoryStoragePath = path.join(sqliteStoreLocation, processModelRepositoryConfig.storage);

  process.env.process_engine__correlation_repository__storage = correlationRepositoryStoragePath;
  process.env.process_engine__external_task_repository__storage = externalTaskRepositoryStoragePath;
  process.env.process_engine__process_model_repository__storage = processModelRepositoryStoragePath;
  process.env.process_engine__flow_node_instance_repository__storage = flowNodeRepositoryStoragePath;
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
