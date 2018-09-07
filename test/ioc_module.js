'use strict';

const {
  IamServiceMock,
  ParallelGatewayTestService,
  ServiceTaskTestService,
} = require('../dist/commonjs/index');

const registerInContainer = (container) => {

  container.register('ParallelGatewayTestService', ParallelGatewayTestService);
  container.register('ServiceTaskTestService', ServiceTaskTestService);

  // This removes the necessity for having a running IdentityServer during testing.
  container.register('IamService', IamServiceMock);
};

module.exports.registerInContainer = registerInContainer;
