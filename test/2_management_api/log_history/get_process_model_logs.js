'use strict';

const should = require('should');

const {TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI: GetProcessModelLgos', () => {

  let testFixtureProvider;

  let defaultIdentity;

  // Taken from test logfile at `test/logs/integration_test_sample_log.log`
  const processModelId = 'integration_test_sample_log';
  const correlationId = 'sample_correlation';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    it('should sucessfully get an array which contains all logs for a given Correlation', async () => {
      const logEntryList = await testFixtureProvider
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

      should(logEntryList.logEntries).be.an.Array();
      should(logEntryList.logEntries).have.a.lengthOf(14);

      for (const currentLogEntry of logEntryList.logEntries) {
        should(currentLogEntry).have.properties(...expectedProperties);
      }
    });

    it('should sucessfully get an array which contains all logs for every ProcessInstance of a ProcessModel', async () => {

      const logEntryList = await testFixtureProvider
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

      should(logEntryList.logEntries).be.an.Array();
      should(logEntryList.logEntries).have.a.lengthOf(28);

      for (const currentLogEntry of logEntryList.logEntries) {
        should(currentLogEntry).have.properties(...expectedProperties);
      }
    });

    it('should return an empty array when trying to get logs for a non existing processModelid', async () => {
      const nonExistingProcessModelId = 'bogus_process_model_id';
      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, nonExistingProcessModelId, correlationId);

      should(logEntryList.logEntries).be.an.Array();
      should(logEntryList.logEntries).be.empty();
    });

    it('should return an empty array when trying to get logs for a non existing correlationId', async () => {
      const nonExistingCorrelationId = 'bogus_correlation_id';
      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, processModelId, nonExistingCorrelationId);

      should(logEntryList.logEntries).be.an.Array();
      should(logEntryList.logEntries).be.empty();
    });

  });

  describe('Pagination', () => {

    it('should apply no limit, an offset of 5 and return 9 items', async () => {

      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, processModelId, correlationId, 5);

      should(logEntryList.logEntries).be.an.instanceOf(Array);
      should(logEntryList.logEntries).have.a.lengthOf(9);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, processModelId, correlationId, 0, 2);

      should(logEntryList.logEntries).be.an.instanceOf(Array);
      should(logEntryList.logEntries).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, processModelId, correlationId, 5, 2);

      should(logEntryList.logEntries).be.an.instanceOf(Array);
      should(logEntryList.logEntries).have.a.lengthOf(2);
    });

    it('should apply an offset of 11, a limit of 5 and return 3 items', async () => {

      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, processModelId, correlationId, 11, 5);

      should(logEntryList.logEntries).be.an.instanceOf(Array);
      should(logEntryList.logEntries).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, processModelId, correlationId, 0, 20);

      should(logEntryList.logEntries).be.an.instanceOf(Array);
      should(logEntryList.logEntries).have.a.lengthOf(14);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog(defaultIdentity, processModelId, correlationId, 1000);

      should(logEntryList.logEntries).be.an.instanceOf(Array);
      should(logEntryList.logEntries).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

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
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });
});
