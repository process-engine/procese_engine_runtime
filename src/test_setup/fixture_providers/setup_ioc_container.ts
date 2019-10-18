import {InvocationContainer} from 'addict-ioc';

export async function initializeBootstrapper(httpIsEnabled: boolean): Promise<InvocationContainer> {

  const container: InvocationContainer = new InvocationContainer({
    defaults: {
      conventionCalls: ['initialize'],
    },
  });

  const iocModules = loadIocModules(httpIsEnabled);

  for (const iocModule of iocModules) {
    iocModule.registerInContainer(container);
  }

  container.validateDependencies();

  return container;
}

function loadIocModules(httpIsEnabled: boolean): Array<any> {

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
    '@process-engine/management_api_core',
    '@process-engine/process_engine_core',
    '@process-engine/persistence_api.repositories.sequelize',
    '@process-engine/persistence_api.services',
    '@process-engine/persistence_api.use_cases',
    '.',
  ];

  if (httpIsEnabled) {
    const httpIocModules = [
      '@essential-projects/http_extension',
      '@process-engine/consumer_api_http',
      '@process-engine/management_api_http',
    ];
    iocModuleNames.push(...httpIocModules);
  }

  const iocModules = iocModuleNames.map((moduleName: string): any => {
    // eslint-disable-next-line
    return require(`${moduleName}/ioc_module`);
  });

  return iocModules;
}
