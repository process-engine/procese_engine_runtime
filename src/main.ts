import {InvocationContainer} from 'addict-ioc';
import * as fs from 'fs';
import {Logger} from 'loggerhythm';
import * as os from 'os';
import * as path from 'path';
import * as Sequelize from 'sequelize';

import {AppBootstrapper} from '@essential-projects/bootstrapper_node';
import {IIdentity} from '@essential-projects/iam_contracts';
import {IAutoStartService, IResumeProcessService} from '@process-engine/process_engine_contracts';

import {configureGlobalRoutes} from './global_route_configurator';
import {migrate as executeMigrations} from './migrator';

const logger: Logger = Logger.createLogger('processengine:runtime:startup');

process.on('unhandledRejection', (err: any) => {
  logger.error('-- An unhandled exception was caught! Error: --');
  logger.error(err);
  logger.error('-- end of unhandled exception stack trace --');
});

const container: InvocationContainer = new InvocationContainer({
  defaults: {
    conventionCalls: ['initialize'],
  },
});

// The folder location for the skeleton-electron app was a different one,
// than the one we are using now. The BPMN Studio needs to be able to provide
// a path to the databases, so that the backend can access them.
export async function startRuntime(sqlitePath: string): Promise<void> {
  initializeEnvironment(sqlitePath);
  await runMigrations(sqlitePath);
  await startProcessEngine();
  await configureGlobalRoutes(container);
  await resumeProcessInstances();
}

function initializeEnvironment(sqlitePath: string): void {

  setConfigPath();
  loadConfiguredEnvironmentOrDefault();

  // set current working directory
  const userDataFolderPath: string = getUserConfigFolder();
  const userDataProcessEngineFolderName: string = 'process_engine_runtime';

  const workingDir: string = path.join(userDataFolderPath, userDataProcessEngineFolderName);

  if (!fs.existsSync(workingDir)) {
    fs.mkdirSync(workingDir);
  }

  process.chdir(workingDir);

  setDatabasePaths(sqlitePath);
}

function setConfigPath(): void {

  const configPathProvided: boolean = process.env.CONFIG_PATH !== undefined;
  if (configPathProvided) {

    const configPathIsAbsolute: boolean = path.isAbsolute(process.env.CONFIG_PATH);
    if (configPathIsAbsolute) {
      ensureConfigPathExists(process.env.CONFIG_PATH);

      return;
    }

    logger.warn('Cannot use path provided with CONFIG_PATH, because it is not absolute!');
    logger.warn('Falling back to default internal config.');
  }

  const internalConfigFolderName: string = 'config';
  const internalConfigPath: string = path.join(__dirname, '..', '..', internalConfigFolderName);

  ensureConfigPathExists(internalConfigPath);

  process.env.CONFIG_PATH = internalConfigPath;
}

function ensureConfigPathExists(configPath: string): void {

  const configPathNotFound: boolean = !fs.existsSync(configPath);
  if (configPathNotFound) {
    logger.error('Specified configuration folder not found!');
    logger.error(`Please make sure the folder ${configPath} exists!`);
    process.exit(1);
  }
}

function loadConfiguredEnvironmentOrDefault(): void {

  const selectedEnvironment: string = process.env.NODE_ENV;

  const defaultEnvironment: string = 'sqlite';

  if (!selectedEnvironment) {
    process.env.NODE_ENV = defaultEnvironment;

    return;
  }

  let configDirNameNormalized: string = path.normalize(process.env.CONFIG_PATH);

  // If the runtime is run within the BPMN studio, electron will place it in `app.asar`.
  // We must account for that fact here, or we won't be able to correctly initialize the runtimes environment.
  const appAsarPathPart: string = path.normalize(path.join('.', 'app.asar'));

  if (configDirNameNormalized.includes('app.asar')) {
    configDirNameNormalized = configDirNameNormalized.replace(appAsarPathPart, '');
  }

  const configPath: string = path.join(configDirNameNormalized, selectedEnvironment);

  const isEnvironmentAvailable: boolean = fs.existsSync(configPath);
  if (isEnvironmentAvailable) {
    return;
  }

  logger.error(`Configuration for environment "${selectedEnvironment}" is not available.`);
  logger.error(`Please make sure the configuration files are available at: ${process.env.CONFIG_PATH}/${selectedEnvironment}`);
  process.exit(1);
}

async function runMigrations(sqlitePath: string): Promise<void> {

  const repositories: Array<string> = [
    'correlation',
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

async function startProcessEngine(): Promise<void> {

  const iocModules: Array<any> = loadIocModules();

  for (const iocModule of iocModules) {
    iocModule.registerInContainer(container);
  }

  container.validateDependencies();

  try {
    const bootstrapper: AppBootstrapper = await container.resolveAsync<AppBootstrapper>('AppBootstrapper');
    await bootstrapper.start();

    logger.info('Bootstrapper started successfully.');

    const autoStartService: IAutoStartService = await container.resolveAsync<IAutoStartService>('AutoStartService');
    await autoStartService.start();

    logger.info('AutoStartService started successfully.');

  } catch (error) {
    logger.error('Bootstrapper failed to start.', error);
  }
}

function loadIocModules(): Array<any> {

  const iocModuleNames: Array<string> = [
    '@essential-projects/bootstrapper',
    '@essential-projects/bootstrapper_node',
    '@essential-projects/event_aggregator',
    '@essential-projects/http',
    '@essential-projects/http_extension',
    '@essential-projects/sequelize_connection_manager',
    '@essential-projects/http_socket_adapter',
    '@essential-projects/http_socket_adapter_socketio',
    '@essential-projects/http_socket_adapter_websocket',
    '@essential-projects/timing',
    '@process-engine/consumer_api_core',
    '@process-engine/consumer_api_http',
    '@process-engine/correlation.service',
    '@process-engine/correlations.repository.sequelize',
    '@process-engine/external_task_api_core',
    '@process-engine/external_task_api_http',
    '@process-engine/external_task.repository.sequelize',
    '@process-engine/flow_node_instance.repository.sequelize',
    '@process-engine/flow_node_instance.service',
    '@process-engine/iam',
    '@process-engine/kpi_api_core',
    '@process-engine/logging_api_core',
    '@process-engine/logging.repository.file_system',
    '@process-engine/metrics_api_core',
    '@process-engine/metrics.repository.file_system',
    '@process-engine/management_api_core',
    // '@process-engine/management_api_http',
    '@process-engine/deployment_api_core',
    '@process-engine/deployment_api_http',
    '@process-engine/process_engine_core',
    '@process-engine/process_model.repository.sequelize',
    '@process-engine/process_model.service',
    '@process-engine/process_model.use_case',
    '@process-engine/token_history_api_core',
  ];

  const iocModules: Array<any> = iocModuleNames.map((moduleName: string): any => {
    return require(`${moduleName}/ioc_module`);
  });

  return iocModules;
}

function setDatabasePaths(sqlitePath: string): void {

  const correlationRepositoryConfig: Sequelize.Options = readConfigFile('sqlite', 'correlation_repository.json');
  const externalTaskRepositoryConfig: Sequelize.Options = readConfigFile('sqlite', 'external_task_repository.json');
  const flowNodeInstanceRepositoryConfig: Sequelize.Options = readConfigFile('sqlite', 'flow_node_instance_repository.json');
  const processModelRepositoryConfig: Sequelize.Options = readConfigFile('sqlite', 'process_model_repository.json');

  const databaseBasePath: string = getSqliteStoragePath(sqlitePath);

  const correlationRepositoryStoragePath: string = path.join(databaseBasePath, correlationRepositoryConfig.storage);
  const externalTaskRepositoryStoragePath: string = path.join(databaseBasePath, externalTaskRepositoryConfig.storage);
  const flowNodeRepositoryStoragePath: string = path.join(databaseBasePath, flowNodeInstanceRepositoryConfig.storage);
  const processModelRepositoryStoragePath: string = path.join(databaseBasePath, processModelRepositoryConfig.storage);

  const logsStoragePath: string = path.join(databaseBasePath, 'logs');
  const metricsStoragePath: string = path.join(databaseBasePath, 'metrics');

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

  const userDataFolderPath: string = getUserConfigFolder();
  const userDataProcessEngineFolderName: string = 'process_engine_runtime';
  const processEngineDatabaseFolderName: string = 'databases';

  const databaseBasePath: string = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

function getUserConfigFolder(): string {

  const userHomeDir: string = os.homedir();
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

  const configFilePath: string = path.resolve(process.env.CONFIG_PATH, env, 'process_engine', repositoryConfigFileName);

  const fileContent: string = fs.readFileSync(configFilePath, 'utf-8');

  const parsedFileContent: Sequelize.Options = JSON.parse(fileContent) as Sequelize.Options;

  return parsedFileContent;
}

async function resumeProcessInstances(): Promise<void> {

  const dummyIdentity: IIdentity = {
    token: 'ZHVtbXlfdG9rZW4=',
    userId: 'system',
  };

  logger.info('Resuming previously interrupted ProcessInstances...');
  const resumeProcessService: IResumeProcessService = await container.resolveAsync<IResumeProcessService>('ResumeProcessService');
  await resumeProcessService.findAndResumeInterruptedProcessInstances(dummyIdentity);
  logger.info('Done.');
}
