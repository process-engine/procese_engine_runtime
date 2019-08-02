'use strict';

const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API: GET -> /process_model/:processModelId/logs?correlationId=value', () => {

  let testFixtureProvider;

  let defaultIdentity;

  // Taken from test logfile at `test/logs/integration_test_sample_log.log`
  const processModelId = 'integration_test_sample_log';
  const processInstanceId = 'f936a62c-38d3-453e-bd06-ae26e31649c0';
  const correlationId = 'sample_correlation';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should sucessfully get an array which contains all logs for a given Correlation', async () => {
    const logs = await testFixtureProvider
      .managementApiClient
      .getProcessModelLog(defaultIdentity, processModelId, correlationId);

    const expectedProperties = [
      'timeStamp',
      'correlationId',
      'processModelId',
      'processInstanceId',
      'logLevel',
      'message',
    ];

    should(logs).be.an.Array();
    should(logs).have.length(14);

    for (const currentLogEntry of logs) {
      should(currentLogEntry).have.properties(...expectedProperties);
    }
  });

  it('should sucessfully get an array which contains all logs for a given ProcessInstance', async () => {
    const logs = await testFixtureProvider
      .managementApiClient
      .getProcessInstanceLog(defaultIdentity, processModelId, processInstanceId);

    const expectedProperties = [
      'timeStamp',
      'correlationId',
      'processModelId',
      'processInstanceId',
      'logLevel',
      'message',
    ];

    should(logs).be.an.Array();
    should(logs).have.length(14);

    for (const currentLogEntry of logs) {
      should(currentLogEntry).have.properties(...expectedProperties);
    }
  });

  it('should sucessfully get an array which contains all logs for every ProcessInstance of a ProcessModel', async () => {

    const logs = await testFixtureProvider
      .managementApiClient
      .getProcessModelLog(defaultIdentity, processModelId);

    const expectedProperties = [
      'timeStamp',
      'correlationId',
      'processModelId',
      'processInstanceId',
      'logLevel',
      'message',
    ];

    should(logs).be.an.Array();
    should(logs).have.length(28);

    for (const currentLogEntry of logs) {
      should(currentLogEntry).have.properties(...expectedProperties);
    }
  });

  it('should throw a 401 error when no auth token is provided', async () => {
    try {
      await testFixtureProvider
        .managementApiClient
        .getProcessModelLog({}, processModelId, correlationId);

      should.fail(null, null, 'The request should have failed with code 401!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error).have.properties('code', 'message');
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should return an empty array when trying to get logs for a non existing processModelid', async () => {
    const nonExistingProcessModelId = 'bogus_process_model_id';
    const logs = await testFixtureProvider
      .managementApiClient
      .getProcessModelLog(defaultIdentity, nonExistingProcessModelId, correlationId);

    should(logs).be.an.Array();
    should(logs).be.empty();
  });

  it('should return an empty array when trying to get logs for a non existing correlationId', async () => {
    const nonExistingCorrelationId = 'bogus_correlation_id';
    const logs = await testFixtureProvider
      .managementApiClient
      .getProcessModelLog(defaultIdentity, processModelId, nonExistingCorrelationId);

    should(logs).be.an.Array();
    should(logs).be.empty();
  });
});
