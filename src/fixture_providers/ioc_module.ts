'use strict';

const IamServiceMock = require('../mocks/index').IamServiceMock;

const {
  ParallelGatewayTestService,
  ServiceTaskTestService,
} = require('../test_services/index');

const {
  ManagementApiClientService,
  ExternalAccessor,
} = require('@process-engine/management_api_client');

export function registerInContainer(container) {

  container.register('ManagementApiExternalAccessor', ExternalAccessor)
    .dependencies('HttpService');

  container.register('ManagementApiClientService', ManagementApiClientService)
    .dependencies('ManagementApiExternalAccessor');

  container.register('ParallelGatewayTestService', ParallelGatewayTestService);
  container.register('ServiceTaskTestService', ServiceTaskTestService);

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
};
