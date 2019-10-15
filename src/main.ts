/* eslint-disable @typescript-eslint/camelcase */
import {InvocationContainer} from 'addict-ioc';
import {exec} from 'child_process';
import * as fs from 'fs';
import {Logger} from 'loggerhythm';
import * as os from 'os';
import * as path from 'path';
import * as Sequelize from 'sequelize';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';
import {IAutoStartService, ICronjobService, IResumeProcessService} from '@process-engine/process_engine_contracts';

import {configureGlobalRoutes} from './global_route_configurator';
import {migrate as executeMigrations} from './migrator';

const logger = Logger.createLogger('processengine:runtime:startup');

process.on('unhandledRejection', (err: Error): void => {
  logger.error('-- An unhandled exception was caught! --');
  logger.error('Error: ', err);
  logger.error('-- end of unhandled exception stack trace --');
});

const container = new InvocationContainer({
  defaults: {
    conventionCalls: ['initialize'],
  },
});

const httpIsEnabled = process.env.NO_HTTP === undefined;

// The folder location for the skeleton-electron app was a different one,
// than the one we are using now. The BPMN Studio needs to be able to provide
// a path to the databases, so that the backend can access them.
export async function startRuntime(sqlitePath: string): Promise<void> {
  setConfigPath();
  loadConfiguredEnvironmentOrDefault();

  await runMigrations(sqlitePath);
  await runPostMigrations();

  setWorkingDirectory(sqlitePath);

  await startProcessEngine();
  if (httpIsEnabled) {
    await configureGlobalRoutes(container);
  }
  await startInternalServices();
  await resumeProcessInstances();
}

function setWorkingDirectory(sqlitePath: string): void {

  // set current working directory
  const userDataFolderPath = getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';

  const workingDir = path.join(userDataFolderPath, userDataProcessEngineFolderName);

  if (!fs.existsSync(workingDir)) {
    fs.mkdirSync(workingDir);
  }

  process.chdir(workingDir);

  const envIsSqlite = process.env.NODE_ENV === 'sqlite';
  if (envIsSqlite) {
    setDatabasePaths(sqlitePath);
  }
}

function setConfigPath(): void {

  const configPathProvided = process.env.CONFIG_PATH !== undefined;
  if (configPathProvided) {

    const configPathIsAbsolute = path.isAbsolute(process.env.CONFIG_PATH);
    if (configPathIsAbsolute) {
      ensureConfigPathExists(process.env.CONFIG_PATH);

      return;
    }

    logger.warn('Cannot use path provided with CONFIG_PATH, because it is not absolute!');
    logger.warn('Falling back to default internal config.');
  }

  const internalConfigFolderName = 'config';
  const internalConfigPath = path.join(__dirname, '..', '..', internalConfigFolderName);

  ensureConfigPathExists(internalConfigPath);

  process.env.CONFIG_PATH = internalConfigPath;
}

function ensureConfigPathExists(configPath: string): void {

  const configPathNotFound = !fs.existsSync(configPath);
  if (configPathNotFound) {
    logger.error('Specified configuration folder not found!');
    logger.error(`Please make sure the folder ${configPath} exists!`);
    process.exit(1);
  }
}

function loadConfiguredEnvironmentOrDefault(): void {

  const selectedEnvironment = process.env.NODE_ENV;

  const defaultEnvironment = 'sqlite';

  if (!selectedEnvironment) {
    process.env.NODE_ENV = defaultEnvironment;

    return;
  }

  let configDirNameNormalized = path.normalize(process.env.CONFIG_PATH);

  // If the runtime is run within the BPMN studio, electron will place it in `app.asar`.
  // We must account for that fact here, or we won't be able to correctly initialize the runtimes environment.
  const appAsarPathPart = path.normalize(path.join('.', 'app.asar'));

  if (configDirNameNormalized.includes('app.asar')) {
    configDirNameNormalized = configDirNameNormalized.replace(appAsarPathPart, '');
  }

  const configPath = path.join(configDirNameNormalized, selectedEnvironment);

  const isEnvironmentAvailable = fs.existsSync(configPath);
  if (isEnvironmentAvailable) {
    return;
  }

  logger.error(`Configuration for environment "${selectedEnvironment}" is not available.`);
  logger.error(`Please make sure the configuration files are available at: ${process.env.CONFIG_PATH}/${selectedEnvironment}`);
  process.exit(1);
}

async function runMigrations(sqlitePath: string): Promise<void> {

  const repositories = [
    'correlation',
    'cronjob_history',
    'external_task',
    'flow_node_instance',
    'process_model',
  ];

  logger.info('Running migrations...');
  for (const repository of repositories) {
    await executeMigrations(repository, sqlitePath);
  }
  logger.info('Migrations successfully executed.');
}

async function runPostMigrations(): Promise<void> {

  try {
    logger.info('Running post-migration scripts.');

    // NOTE:
    // When embedding the ProcessEngine, the cwd may not necessarily be the directory that contains the runtimes.
    // However, to access npm scripts, the cwd must be that directory.
    // To get around this issue, we temporarily change the cwd to the ProcessEngine's location, run the post-migrations
    // and restore the old cwd afterwards.
    const currentWorkingDir = process.cwd();
    let runtimeDir = path.normalize(path.resolve(__dirname, '..', '..'));

    // If the runtime is run within the BPMN studio, electron will place it in `app.asar`.
    // We must account for that fact here, or we won't be able to correctly initialize the runtimes environment.
    const appAsarPathPart = path.normalize(path.join('.', 'app.asar'));

    if (runtimeDir.includes('app.asar')) {
      runtimeDir = runtimeDir.replace(appAsarPathPart, '');
    }

    process.chdir(runtimeDir);
    await execAsync('npm run postMigrations');
    process.chdir(currentWorkingDir);

    logger.info('Post-Migrations successfully executed.');
  } catch (error) {
    logger.error('Failed to run Post-Migrations', error);
    process.exit(1);
  }
}

async function startProcessEngine(): Promise<void> {

  const iocModules = loadIocModules();

  for (const iocModule of iocModules) {
    iocModule.registerInContainer(container);
  }

  container.validateDependencies();

  try {
    const bootstrapper = await container.resolveAsync<AppBootstrapper>('AppBootstrapper');
    await bootstrapper.start();

    logger.info('Bootstrapper started successfully.');

  } catch (error) {
    logger.error('Bootstrapper failed to start.', error);
    process.exit(1);
  }
}

async function startInternalServices(): Promise<void> {

  try {
    logger.info('Starting Services...');

    const autoStartService = await container.resolveAsync<IAutoStartService>('AutoStartService');
    await autoStartService.start();

    logger.info('AutoStartService started.');

    const cronjobService = await container.resolveAsync<ICronjobService>('CronjobService');
    await cronjobService.start();

    logger.info('CronjobService started.');
  } catch (error) {
    logger.error('Failed to start the internal services.', error);
    process.exit(1);
  }
}

function loadIocModules(): Array<any> {

  const iocModuleNames = [
    '@essential-projects/bootstrapper',
    '@essential-projects/bootstrapper_node',
    '@essential-projects/event_aggregator',
    '@essential-projects/http',
    '@essential-projects/sequelize_connection_manager',
    '@essential-projects/timing',
    '@process-engine/consumer_api_core',
    '@process-engine/iam',
    '@process-engine/logging_api_core',
    '@process-engine/logging.repository.file_system',
    '@process-engine/metrics_api_core',
    '@process-engine/metrics.repository.file_system',
    '@process-engine/management_api_core',
    '@process-engine/process_engine_core',
    '@process-engine/persistence_api.repositories.sequelize',
    '@process-engine/persistence_api.services',
    '@process-engine/persistence_api.use_cases',
  ];

  const httpIocModules = [
    '@essential-projects/http_extension',
    '@process-engine/consumer_api_http',
    '@process-engine/management_api_http',
  ];

  if (httpIsEnabled) {
    iocModuleNames.push(...httpIocModules);
  }

  const iocModules = iocModuleNames.map((moduleName: string): any => {
    // eslint-disable-next-line
    return require(`${moduleName}/ioc_module`);
  });

  return iocModules;
}

function setDatabasePaths(sqlitePath: string): void {

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
  const metricsStoragePath = path.join(databaseBasePath, 'metrics');

  process.env.process_engine__correlation_repository__storage = correlationRepositoryStoragePath;
  process.env.process_engine__external_task_repository__storage = externalTaskRepositoryStoragePath;
  process.env.process_engine__process_model_repository__storage = processModelRepositoryStoragePath;
  process.env.process_engine__flow_node_instance_repository__storage = flowNodeRepositoryStoragePath;

  process.env.process_engine__logging_repository__log_output_path = logsStoragePath;
  process.env.process_engine__metrics_repository__log_output_path = metricsStoragePath;
}

function getSqliteStoragePath(sqlitePath?: string): string {

  if (sqlitePath) {
    return sqlitePath;
  }

  const userDataFolderPath = getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

function getUserConfigFolder(): string {

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

function readConfigFile(env: string, repositoryConfigFileName: string): Sequelize.Options {

  const configFilePath = path.resolve(process.env.CONFIG_PATH, env, 'process_engine', repositoryConfigFileName);

  const fileContent = fs.readFileSync(configFilePath, 'utf-8');

  const parsedFileContent = JSON.parse(fileContent) as Sequelize.Options;

  return parsedFileContent;
}

async function resumeProcessInstances(): Promise<void> {

  // Note that the ProcessInstances will be resumed with the Identity that started them.
  // The identity we use here does not matter at all.
  const dummyIdentity: IIdentity = {
    token: 'ZHVtbXlfdG9rZW4=',
    userId: 'SYSTEM',
  };

  logger.info('Resuming previously interrupted ProcessInstances...');
  const resumeProcessService = await container.resolveAsync<IResumeProcessService>('ResumeProcessService');
  await resumeProcessService.findAndResumeInterruptedProcessInstances(dummyIdentity);
  logger.info('Done.');
}

async function execAsync(command): Promise<string> {

  return new Promise((resolve, reject): void => {
    const childProcess = exec(command, (error, stdout, stdErr): void => {

      if (error) {
        return reject(error);
      }

      return resolve(stdout);
    });

    childProcess.stdout.on('data', (data): void => logger.verbose(data));
    childProcess.stderr.on('data', (data): void => logger.error(data));
  });
}
