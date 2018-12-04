#!/usr/bin/env node
'use strict';

const InvocationContainer = require('addict-ioc').InvocationContainer;
const fs = require('fs');
const Logger = require('loggerhythm').Logger;
const path = require('path');
const platformFolders = require('platform-folders');

const executeMigrations = require('./migrator').migrate;

const logger = Logger.createLogger('processengine:runtime:startup');

process.on('unhandledRejection', (err) => {
  logger.error('-- An unhandled exception was caught! Error: --');
  logger.error(err);
  logger.error('-- end of unhandled exception stack trace --');
});

const container = new InvocationContainer({
  defaults: {
    conventionCalls: ['initialize'],
  },
});

// The folder location for the skeleton-electron app was a different one,
// than the one we are using now. The BPMN Studio needs to be able to provide
// a path to the databases, so that the backend can access them.
module.exports = async (sqlitePath) => {
  await runMigrations(sqlitePath);
  await startProcessEngine(sqlitePath);
  await resumeProcessInstances();
};

async function runMigrations(sqlitePath) {

  const env = process.env.NODE_ENV || 'sqlite';

  const repositories = [
    'correlation',
    'external_task',
    'flow_node_instance',
    'process_model',
  ];

  for (const repository of repositories) {
    await executeMigrations(env, repository, sqlitePath);
  }
}

async function startProcessEngine(sqlitePath) {

  const iocModules = loadIocModules();

  initializeEnvironment(sqlitePath);

  for (const iocModule of iocModules) {
    iocModule.registerInContainer(container);
  }

  container.validateDependencies();

  try {
    const bootstrapper = await container.resolveAsync('AppBootstrapper');
    await bootstrapper.start();

    logger.info('Bootstrapper started successfully.');
  } catch (error) {
    logger.error('Bootstrapper failed to start.', error);
  }
}

function loadIocModules() {

  const iocModuleNames = [
    '@essential-projects/bootstrapper',
    '@essential-projects/bootstrapper_node',
    '@essential-projects/event_aggregator',
    '@essential-projects/http_extension',
    '@essential-projects/services',
    '@essential-projects/sequelize_connection_manager',
    '@essential-projects/timing',
    '@process-engine/consumer_api_core',
    '@process-engine/consumer_api_http',
    '@process-engine/correlations.repository.sequelize',
    '@process-engine/external_task_api_core',
    '@process-engine/external_task_api_http',
    '@process-engine/external_task.repository.sequelize',
    '@process-engine/flow_node_instance.repository.sequelize',
    '@process-engine/iam',
    '@process-engine/kpi_api_core',
    '@process-engine/logging_api_core',
    '@process-engine/logging.repository.file_system',
    '@process-engine/metrics_api_core',
    '@process-engine/metrics.repository.file_system',
    '@process-engine/management_api_core',
    '@process-engine/management_api_http',
    '@process-engine/deployment_api_core',
    '@process-engine/deployment_api_http',
    '@process-engine/process_engine_core',
    '@process-engine/process_model.repository.sequelize',
    '@process-engine/token_history_api_core',
  ];

  const iocModules = iocModuleNames.map((moduleName) => {
    return require(`${moduleName}/ioc_module`); //eslint-disable-line
  });

  return iocModules;
}

function loadConfiguredEnvironmentOrDefault() {

  const availableEnvironments = [
    'sqlite',
    'postgres',
  ];

  const configuredEnvironment = process.env.NODE_ENV;

  const defaultEnvironment = 'sqlite';

  if (configuredEnvironment === undefined) {
    process.env.NODE_ENV = defaultEnvironment;
    return;
  }

  const isEnvironmentAvailable = availableEnvironments.find((environment) => {
    return configuredEnvironment === environment;
  });

  if (isEnvironmentAvailable) {
    process.env.NODE_ENV = configuredEnvironment;
    return;
  }

  logger.info(`Configuration for environment "${configuredEnvironment}" is not available.`);
  logger.info(`Please make sure the configuration files are available at: ${__dirname}/config/${configuredEnvironment}`);
  process.exit(1);
}

function initializeEnvironment(sqlitePath) {

  loadConfiguredEnvironmentOrDefault();

  // set current working directory
  const userDataFolderPath = platformFolders.getConfigHome();
  const userDataProcessEngineFolderName = 'process_engine_runtime';

  const workingDir = path.join(userDataFolderPath, userDataProcessEngineFolderName);

  if (!fs.existsSync(workingDir)) {
    fs.mkdirSync(workingDir);
  }

  process.chdir(workingDir);

  setConfigPath();
  setDatabasePaths(sqlitePath);
}

function setConfigPath() {
  const configPath = path.join(__dirname, 'config');
  process.env.CONFIG_PATH = configPath;
}

function setDatabasePaths(sqlitePath) {

  const databaseBasePath = getSqliteStoragePath(sqlitePath);

  const correlationRepositoryStoragePath = path.join(databaseBasePath, 'correlation.sqlite');
  const externalTaskRepositoryStoragePath = path.join(databaseBasePath, 'external_task.sqlite');
  const processModelRepositoryStoragePath = path.join(databaseBasePath, 'process_model.sqlite');
  const flowNodeRepositoryStoragePath = path.join(databaseBasePath, 'flow_node_instance.sqlite');
  const timerRepositoryStoragePath = path.join(databaseBasePath, 'timer.sqlite');

  const logsStoragePath = path.join(databaseBasePath, 'logs');
  const metricsStoragePath = path.join(databaseBasePath, 'metrics');

  process.env.process_engine__correlation_repository__storage = correlationRepositoryStoragePath;
  process.env.process_engine__external_task_repository__storage = externalTaskRepositoryStoragePath;
  process.env.process_engine__process_model_repository__storage = processModelRepositoryStoragePath;
  process.env.process_engine__flow_node_instance_repository__storage = flowNodeRepositoryStoragePath;
  process.env.process_engine__timer_repository__storage = timerRepositoryStoragePath;

  process.env.process_engine__logging_repository__log_output_path = logsStoragePath;
  process.env.process_engine__metrics_repository__log_output_path = metricsStoragePath;
}

function getSqliteStoragePath(sqlitePath) {

  if (sqlitePath) {
    return sqlitePath;
  }

  const userDataFolderPath = platformFolders.getConfigHome();
  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.resolve(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  return databaseBasePath;
}

async function resumeProcessInstances() {
  logger.info('Resuming previously interrupted ProcessInstances...');
  const resumeProcessService = await container.resolveAsync('ResumeProcessService');
  await resumeProcessService.findAndResumeInterruptedProcessInstances();
  logger.info('Done.');
}
