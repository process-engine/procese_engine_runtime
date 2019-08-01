import {InvocationContainer} from 'addict-ioc';

import {
  ConsumerApiClient,
  ExternalAccessor as ConsumerApiExternalAccessor,
  InternalAccessor as ConsumerApiInternalAccessor,
} from '@process-engine/consumer_api_client';

import {
  ExternalTaskApiClientService,
  ExternalTaskApiExternalAccessor,
  ExternalTaskApiInternalAccessor,
} from '@process-engine/external_task_api_client';

import {ExternalTaskSampleWorker} from '@process-engine/external_task_sample_worker';

import {
  ManagementApiClient,
  ExternalAccessor as ManagementApiExternalAccessor,
  InternalAccessor as ManagementApiInternalAccessor,
} from '@process-engine/management_api_client';

import {IamServiceMock} from '../mocks/index';

import {
  ParallelGatewayTestService,
  ServiceTaskTestService,
} from '../test_services/index';

export function registerInContainer(container: InvocationContainer): void {

  const accessApisInternally = process.env.API_ACCESS_TYPE === 'internal';

  if (accessApisInternally) {
    registerApisWithInternalAccessors(container);
  } else {
    registerWithExternalAccessors(container);
  }

  container.register('ExternalTaskSampleWorker', ExternalTaskSampleWorker)
    .dependencies('ExternalTaskApiClient', 'IdentityService')
    .configure('external_task:sample_worker')
    .singleton();

  container.register('ParallelGatewayTestService', ParallelGatewayTestService);
  container.register('ServiceTaskTestService', ServiceTaskTestService);

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
}

function registerApisWithInternalAccessors(container: InvocationContainer): void {

  container.register('ConsumerApiInternalAccessor', ConsumerApiInternalAccessor)
    .dependencies(
      'ConsumerApiEmptyActivityService',
      'ConsumerApiEventService',
      'ConsumerApiManualTaskService',
      'ConsumerApiNotificationService',
      'ConsumerApiProcessModelService',
      'ConsumerApiUserTaskService',
    );

  container.register('ConsumerApiClient', ConsumerApiClient)
    .dependencies('ConsumerApiInternalAccessor');

  container.register('ExternalTaskApiInternalAccessor', ExternalTaskApiInternalAccessor)
    .dependencies('ExternalTaskApiService');

  container.register('ExternalTaskApiClient', ExternalTaskApiClientService)
    .dependencies('ExternalTaskApiInternalAccessor');

  container.register('ManagementApiInternalAccessor', ManagementApiInternalAccessor)
    .dependencies(
      'ManagementApiCorrelationService',
      'ManagementApiCronjobService',
      'ManagementApiEmptyActivityService',
      'ManagementApiEventService',
      'ManagementApiFlowNodeInstanceService',
      'ManagementApiKpiService',
      'ManagementApiLoggingService',
      'ManagementApiManualTaskService',
      'ManagementApiNotificationService',
      'ManagementApiProcessModelService',
      'ManagementApiTokenHistoryService',
      'ManagementApiUserTaskService',
    );

  container.register('ManagementApiClient', ManagementApiClient)
    .dependencies('ManagementApiInternalAccessor');
}

function registerWithExternalAccessors(container: InvocationContainer): void {

  container.register('ConsumerApiExternalAccessor', ConsumerApiExternalAccessor)
    .dependencies('HttpClient')
    .configure('consumer_api:external_accessor');

  container.register('ConsumerApiClient', ConsumerApiClient)
    .dependencies('ConsumerApiExternalAccessor');

  container.register('ExternalTaskApiExternalAccessor', ExternalTaskApiExternalAccessor)
    .dependencies('HttpClient');

  container.register('ExternalTaskApiClient', ExternalTaskApiClientService)
    .dependencies('ExternalTaskApiExternalAccessor');

  container.register('ManagementApiExternalAccessor', ManagementApiExternalAccessor)
    .dependencies('HttpClient')
    .configure('management_api:external_accessor');

  container.register('ManagementApiClient', ManagementApiClient)
    .dependencies('ManagementApiExternalAccessor');

}
