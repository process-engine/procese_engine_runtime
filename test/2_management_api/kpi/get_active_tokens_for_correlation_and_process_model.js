'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI: GetActiveTokensForCorrelationAndProcessModel', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  const processModelId = 'test_management_api_heatmap_sample';

  let defaultIdentity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const correlationId = uuid.v4();

    before(async () => {
      const initialToken = {
        user_task: true,
      };

      await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 2);
    });

    it('should successfully get the active tokens for a running ProcessModel within a correlation', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId);

      should(activeTokenList.activeTokens).be.an.Array();
      const assertionError = `Expected ${JSON.stringify(activeTokenList.activeTokens)} to have two entries, but received ${activeTokenList.activeTokens.length}!`;
      should(activeTokenList.activeTokens).have.a.lengthOf(2, assertionError); // 2 UserTasks running in parallel executed branches

      for (const activeToken of activeTokenList.activeTokens) {
        assertActiveToken(activeToken, activeToken.flowNodeId);
      }
    });

    function assertActiveToken(activeToken, flowNodeId) {

      const expectedPayload = {
        user_task: true,
      };

      should(activeToken.processModelId).be.equal(processModelId);
      should(activeToken.flowNodeId).be.equal(flowNodeId);
      should(activeToken.correlationId).be.equal(correlationId);
      should(activeToken.identity).be.eql(defaultIdentity);
      should(activeToken.payload).be.eql(expectedPayload);

      should(activeToken).have.property('processInstanceId');
      should(activeToken).have.property('flowNodeInstanceId');
      should(activeToken).have.property('createdAt');
    }
  });

  describe('Pagination', () => {

    const correlationId = uuid.v4();

    before(async () => {
      const initialToken = {
        user_task: true,
      };

      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 suspended tasks after this (2 per instance).
      for (let i = 0; i < 5; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId, 5);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId, 0, 2);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId, 5, 2);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId, 7, 5);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId, 0, 20);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId, 1000);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).be.empty();
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    it('should throw a 401 error when no auth token is provided', async () => {
      try {
        await testFixtureProvider
          .managementApiClient
          .getActiveTokensForCorrelationAndProcessModel({}, correlationId, processModelId);

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
