'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetActiveTokensForProcessModel', () => {

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

    before(async () => {
      const initialToken = {
        user_task: true,
      };

      await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 2);
    });

    it('should successfully get the active tokens for a running ProcessModel', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelId);

      should(activeTokens).be.an.Array();
      const assertionError = `Expected ${JSON.stringify(activeTokens)} to have two entries, but received ${activeTokens.length}!`;
      should(activeTokens).have.a.lengthOf(2, assertionError); // 2 UserTasks running in parallel executed branches

      for (const activeToken of activeTokens) {
        assertActiveToken(activeToken, activeToken.flowNodeId);
      }
    });

    it('should not include tokens from already finished ProcessModels with the same ID', async () => {

      // Execute another ProcessInstance and wait for it to finish this time.
      // The tokens of this ProcessInstance should not show as ActiveTokens.
      await executeSampleProcess();

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelId);

      should(activeTokens).be.an.Array();
      const assertionError = `Expected ${JSON.stringify(activeTokens)} to have two entries, but received ${activeTokens.length}!`;
      should(activeTokens).have.a.lengthOf(2, assertionError); // 2 UserTasks running in parallel executed branches

      for (const activeToken of activeTokens) {
        assertActiveToken(activeToken, activeToken.flowNodeId);
      }
    });

    async function executeSampleProcess() {

      const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;
      const payload = {
        correlationId: correlationId,
        inputValues: {
          user_task: false,
        },
      };

      await testFixtureProvider
        .managementApiClient
        .startProcessInstance(defaultIdentity, processModelId, payload, returnOn);
    }

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

    before(async () => {
      const correlationId = uuid.v4();
      await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdTokenSample, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelIdTokenSample, 4);
    });

    it('should apply no limit, an offset of 1 and return 3 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelIdTokenSample, 1);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(3);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelIdTokenSample, 0, 2);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 1, a limit of 2 and return 2 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelIdTokenSample, 1, 2);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 2, a limit of 5 and return 2 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelIdTokenSample, 2, 5);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(2);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelIdTokenSample, 0, 20);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(4);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForProcessModel(defaultIdentity, processModelIdTokenSample, 1000);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should throw a 401 error when no auth token is provided', async () => {
      try {
        await testFixtureProvider
          .managementApiClient
          .getActiveTokensForProcessModel({}, processModelId);

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
