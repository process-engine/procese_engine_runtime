'use strict';

const IamServiceMock = require('../mocks/index').IamServiceMock;

const {
  ParallelGatewayTestService,
  ServiceTaskTestService,
} = require('../test_services/index');

const ConsumerApiClientService = require('@process-engine/consumer_api_client').ConsumerApiClientService;
const ConsumerApiExternalAccessor = require('@process-engine/consumer_api_client').ExternalAccessor;

const ManagementApiClientService = require('@process-engine/management_api_client').ManagementApiClientService;
const ManagementApiExternalAccessor = require('@process-engine/management_api_client').ExternalAccessor;

export function registerInContainer(container) {

  container.register('ConsumerApiExternalAccessor', ConsumerApiExternalAccessor)
    .dependencies('HttpService');

  container.register('ConsumerApiClientService', ConsumerApiClientService)
    .dependencies('ConsumerApiExternalAccessor');

  container.register('ManagementApiExternalAccessor', ManagementApiExternalAccessor)
    .dependencies('HttpService');

  container.register('ManagementApiClientService', ManagementApiClientService)
    .dependencies('ManagementApiExternalAccessor');

  container.register('ParallelGatewayTestService', ParallelGatewayTestService);
  container.register('ServiceTaskTestService', ServiceTaskTestService);

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
};
