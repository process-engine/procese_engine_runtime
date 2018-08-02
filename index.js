#!/usr/bin/env node

const InvocationContainer = require('addict-ioc').InvocationContainer;
const logger = require('loggerhythm').Logger.createLogger('bootstrapper');
const path = require('path');

startProcessEngine();

async function startProcessEngine() {

  const iocModules = loadIocModules();

  initializeEnvironment();

  const container = new InvocationContainer({
    defaults: {
      conventionCalls: ['initialize'],
    },
  });

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
    '@process-engine/consumer_api_core', // Required by the process engine's UserTask handler
    '@process-engine/flow_node_instance.repository.sequelize',
    '@process-engine/iam',
    '@process-engine/management_api_core',
    '@process-engine/management_api_http',
    '@process-engine/deployment_api_core',
    '@process-engine/deployment_api_http',
    '@process-engine/process_engine',
    '@process-engine/process_model.repository.sequelize',
    '@process-engine/timers.repository.sequelize',
  ];

  const iocModules = iocModuleNames.map((moduleName) => {
    return require(`${moduleName}/ioc_module`);
  });

  return iocModules;
}

function initializeEnvironment() {

  process.env.NODE_ENV = 'production';

  setDatabasePaths();
}

function setDatabasePaths() {

  const userDataFolderPath = require('platform-folders').getConfigHome();
  const userDataProcessEngineFolderName = 'process_engine_runtime';
  const processEngineDatabaseFolderName = 'databases';

  const databaseBasePath = path.join(userDataFolderPath, userDataProcessEngineFolderName, processEngineDatabaseFolderName);

  const processModelRepositoryStoragePath = path.join(databaseBasePath, 'process_models.sqlite');
  const flowNodeRepositoryStoragePath = path.join(databaseBasePath, 'flow_node_instances.sqlite');
  const timerRepositoryStoragePath = path.join(databaseBasePath, 'timers.sqlite');

  process.env.process_engine__process_model_repository__storage = processModelRepositoryStoragePath;
  process.env.process_engine__flow_node_instance_repository__storage = flowNodeRepositoryStoragePath;
  process.env.process_engine__timer_repository__storage = timerRepositoryStoragePath;
}
