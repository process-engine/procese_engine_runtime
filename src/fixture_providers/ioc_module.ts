'use strict';

const IamServiceMock = require('../mocks/index').IamServiceMock;

const {
  ParallelGatewayTestService,
  ServiceTaskTestService,
} = require('../test_services/index');

export function registerInContainer(container) {

  container.register('ParallelGatewayTestService', ParallelGatewayTestService);
  container.register('ServiceTaskTestService', ServiceTaskTestService);

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
};
