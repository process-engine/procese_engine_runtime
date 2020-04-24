'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI: GetActiveTokensForProcessInstance', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  const processModelId = 'test_management_api_heatmap_sample';
  const processModelIdTokenSample = 'test_management_api_active_token_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId, processModelIdTokenSample]);
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const correlationId = uuid.v4();
    let processInstanceId;

    before(async () => {
      const initialToken = {
        user_task: true,
      };

      const startResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);

      processInstanceId = startResult.processInstanceId;

      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 2);
    });

    it('should successfully get the active tokens for a running ProcessInstance', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId);

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

    let processInstanceId;

    before(async () => {
      const correlationId = uuid.v4();

      const startResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdTokenSample, correlationId);

      processInstanceId = startResult.processInstanceId;

      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelIdTokenSample, 4);
    });

    it('should apply no limit, an offset of 1 and return 3 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId, 1);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(3);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId, 0, 2);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 1, a limit of 2 and return 2 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId, 1, 2);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 2, a limit of 5 and return 2 items', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId, 2, 5);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(2);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId, 0, 20);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).have.a.lengthOf(4);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const activeTokenList = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessInstance(defaultIdentity, processInstanceId, 1000);

      should(activeTokenList.activeTokens).be.an.Array();
      should(activeTokenList.activeTokens).be.empty();
    });
  });

  describe('Security Checks', () => {

    it('should throw a 401 error when no auth token is provided', async () => {
      try {
        await testFixtureProvider
          .managementApiClient
          .getActiveTokensForProcessInstance({}, 'SomeProcessInstanceId');

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
