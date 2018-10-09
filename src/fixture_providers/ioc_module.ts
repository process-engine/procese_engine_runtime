'use strict';

import {InvocationContainer} from 'addict-ioc';

import {
  ParallelGatewayTestService,
  ServiceTaskTestService,
} from '../test_services/index';

import {
  ConsumerApiClientService,
  ExternalAccessor as ConsumerApiExternalAccessor,
  InternalAccessor as ConsumerApiInternalAccessor,
} from '@process-engine/consumer_api_client';

import {
  ManagementApiClientService,
  ExternalAccessor as ManagementApiExternalAccessor,
  InternalAccessor as ManagementApiInternalAccessor,
} from '@process-engine/management_api_client';

import {IamServiceMock} from '../mocks/index';

export function registerInContainer(container: InvocationContainer): void {

  const accessApisInternally: boolean = process.env.API_ACCESS_TYPE === 'internal';

  if (accessApisInternally) {
    registerApisWithInternalAccessors(container);
  } else {
    registerWithExternalAccessors(container);
  }

  container.register('ParallelGatewayTestService', ParallelGatewayTestService);
  container.register('ServiceTaskTestService', ServiceTaskTestService);

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
}

function registerApisWithInternalAccessors(container: InvocationContainer): void {

  container.register('ConsumerApiInternalAccessor', ConsumerApiInternalAccessor)
    .dependencies('ConsumerApiService');

  container.register('ConsumerApiClientService', ConsumerApiClientService)
    .dependencies('ConsumerApiInternalAccessor');

  container.register('ManagementApiInternalAccessor', ManagementApiInternalAccessor)
    .dependencies('ManagementApiService');

  container.register('ManagementApiClientService', ManagementApiClientService)
    .dependencies('ManagementApiInternalAccessor');
}

function registerWithExternalAccessors(container: InvocationContainer): void {

  container.register('ConsumerApiExternalAccessor', ConsumerApiExternalAccessor)
    .dependencies('HttpService')
    .configure('consumer_api:external_accessor');

  container.register('ConsumerApiClientService', ConsumerApiClientService)
    .dependencies('ConsumerApiExternalAccessor');

  container.register('ManagementApiExternalAccessor', ManagementApiExternalAccessor)
    .dependencies('HttpService')
    .configure('management_api:external_accessor');

  container.register('ManagementApiClientService', ManagementApiClientService)
    .dependencies('ManagementApiExternalAccessor');

}
