'use strict';

const IamServiceMock = require('../mocks/index').IamServiceMock;

const {
  ParallelGatewayTestService,
  ServiceTaskTestService,
} = require('../test_services/index');

const ConsumerApiClientService = require('@process-engine/consumer_api_client').ConsumerApiClientService;
const ConsumerApiInternalAccessor = require('@process-engine/consumer_api_client').InternalAccessor;

const ManagementApiClientService = require('@process-engine/management_api_client').ManagementApiClientService;
const ManagementApiInternalAccessor = require('@process-engine/management_api_client').InternalAccessor;

export function registerInContainer(container) {

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
};
