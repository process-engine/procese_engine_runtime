'use strict';

import {IamServiceMock} from '../mocks/index';

import {
  ParallelGatewayTestService,
  ServiceTaskTestService,
} from '../test_services/index';

import {
  ConsumerApiClientService,
  InternalAccessor as ConsumerApiInternalAccessor,
} from '@process-engine/consumer_api_client';

import {
  ManagementApiClientService,
  InternalAccessor as ManagementApiInternalAccessor,
} from '@process-engine/management_api_client';

export function registerInContainer(container: any): void {

  container.register('ConsumerApiInternalAccessor', ConsumerApiInternalAccessor)
    .dependencies('ConsumerApiService');

  container.register('ConsumerApiClientService', ConsumerApiClientService)
    .dependencies('ConsumerApiInternalAccessor');

  container.register('ManagementApiInternalAccessor', ManagementApiInternalAccessor)
    .dependencies('ManagementApiService');

  container.register('ManagementApiClientService', ManagementApiClientService)
    .dependencies('ManagementApiInternalAccessor');

  container.register('ParallelGatewayTestService', ParallelGatewayTestService);
  container.register('ServiceTaskTestService', ServiceTaskTestService);

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
}
