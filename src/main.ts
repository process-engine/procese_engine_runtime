/* eslint-disable @typescript-eslint/camelcase */
import {InvocationContainer} from 'addict-ioc';
import * as fs from 'fs';
import {Logger} from 'loggerhythm';
import * as path from 'path';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';
import {IAutoStartService, ICronjobService, IResumeProcessService} from '@process-engine/process_engine_contracts';

import * as environment from './modules/environment';
import {configureGlobalRoutes} from './modules/global_route_configurator';
import {migrate as executeMigrations} from './modules/migrator';

import * as postMigrations from './post-migrations';

const logger = Logger.createLogger('processengine:runtime:startup');

process.on('unhandledRejection', (err: Error): void => {
  logger.error('-- An unhandled exception was caught! --');
  logger.error('Error: ', err);
  logger.error('-- end of unhandled exception stack trace --');
});

let container: InvocationContainer;
let sqlitePath: string;
let minimalSetup = false;
let workDir: string;

// Allows an embedding application like BPMN Studio to pass its own settings to the runtime.
type startupArgs = {
  sqlitePath?: string;
  logFilePath?: string;
  container?: InvocationContainer;
  minimalSetup?: boolean;
  workDir?: string;
  enableHttp?: boolean;
  useHttpRootRoutes?: boolean;
}

let httpIsEnabled = true;
let useHttpRootRoutes = true;

// eslint-disable-next-line consistent-return
export async function startRuntime(args: startupArgs | string): Promise<void> {

  parseArguments(args);

  if (minimalSetup === true) {
    logger.warn('MinimalSetup is set to true. Will only load the ioc modules into the container. EVERYTHING else is up to you!');
    return loadIocModules();
  }

  setConfigPath();
  validateEnvironment();

  const envIsSqlite = process.env.NODE_ENV === 'sqlite';
  if (envIsSqlite) {
    environment.setDatabasePaths(sqlitePath);
  }

  await runMigrations();
  await runPostMigrations();

  setWorkingDirectory();

  loadIocModules();

  await startProcessEngine();

  if (httpIsEnabled) {
    await configureGlobalRoutes(container, useHttpRootRoutes);
  }
  await startInternalServices();
  await resumeProcessInstances();
}

function parseArguments(args: startupArgs | string): void {

  if (typeof args === 'string') {
    logger.verbose(`Using sqlitePath ${args}`);
    sqlitePath = args;
  } else if (typeof args === 'object' && args.sqlitePath !== undefined) {
    logger.verbose(`Using sqlitePath ${args.sqlitePath}`);
    sqlitePath = args.sqlitePath;
  }

  if (typeof args === 'object' && args.container !== undefined) {

    if (!(args.container instanceof InvocationContainer)) {
      logger.error('Injected containers must be an instance of an addict_ioc InvocationContainer!');
      process.exit(1);
    }

    logger.verbose('Using provided ioc container');
    container = args.container;
  } else {
    container = new InvocationContainer({
      defaults: {
        conventionCalls: ['initialize'],
      },
    });
  }

  if (typeof args === 'object' && args.minimalSetup !== undefined) {
    logger.verbose(`Minimal Setup: ${args.minimalSetup}`);
    minimalSetup = args.minimalSetup;
  }

  if (typeof args === 'object' && args.workDir !== undefined) {
    if (!path.isAbsolute(args.workDir)) {
      logger.error('The path in startup parameter "workDir" must be absolute!');
      process.exit(1);
    }
    logger.verbose(`Using working directory: ${args.workDir}`);
    workDir = args.workDir;
  }

  if (typeof args === 'object' && args.logFilePath !== undefined) {
    logger.verbose(`Using log file path: ${args.logFilePath}`);
    process.env.process_engine__logging_repository__output_path = path.resolve(args.logFilePath, 'logs');
    process.env.process_engine__metrics_repository__output_path = path.resolve(args.logFilePath, 'metrics');
  }

  if (typeof args === 'object' && args.enableHttp !== undefined) {
    logger.verbose(`Enable http endpoints: ${args.enableHttp}`);
    httpIsEnabled = args.enableHttp;
  }

  if (typeof args === 'object' && args.useHttpRootRoutes !== undefined) {
    logger.verbose(`Using / and /security/authority http routes: ${args.useHttpRootRoutes}`);
    useHttpRootRoutes = args.useHttpRootRoutes;
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

function validateEnvironment(): void {

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

function setWorkingDirectory(): void {

  // set current working directory
  const userDataFolderPath = environment.getUserConfigFolder();
  const userDataProcessEngineFolderName = 'process_engine_runtime';

  const workDirToUse = workDir !== undefined
    ? workDir
    : path.join(userDataFolderPath, userDataProcessEngineFolderName);

  if (!fs.existsSync(workDirToUse)) {
    fs.mkdirSync(workDirToUse);
  }

  process.chdir(workDirToUse);
}

async function runMigrations(): Promise<void> {

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

    await postMigrations.runPostMigrationForV711();
    await postMigrations.runPostMigrationForV910();

    logger.info('Post-Migrations successfully executed.');
  } catch (error) {
    logger.error('Failed to run Post-Migrations', error);
    process.exit(1);
  }
}

function loadIocModules(): void {

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

  for (const iocModule of iocModules) {
    iocModule.registerInContainer(container);
  }

  container.validateDependencies();
}

async function startProcessEngine(): Promise<void> {

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
