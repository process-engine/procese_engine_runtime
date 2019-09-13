'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetActiveTokensForFlowNode', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_heatmap_sample';
  const userTask1Id = 'UserTask_1';

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

    after(async () => {
      // The tasks must be cleaned up here, so they won't interfere with the pagination tests.
      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForProcessModel(testFixtureProvider.identities.superAdmin, processModelId);

      for(const userTask of userTaskList.userTasks) {
        const {correlationId, flowNodeInstanceId, processInstanceId} = userTask;

        await testFixtureProvider
          .managementApiClient
          .finishUserTask(testFixtureProvider.identities.superAdmin, processInstanceId, correlationId, flowNodeInstanceId);
      }
    });

    it('should successfully get the active tokens for a running FlowNodeInstance', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id);

      should(activeTokens).be.an.Array();
      should(activeTokens).have.a.lengthOf(1);

      const activeToken = activeTokens[0];

      assertActiveToken(activeToken, userTask1Id);
    });

    it('should not include tokens from already finished FlowNodeInstances with the same ID', async () => {

      // Execute another ProcessInstance and wait for it to finish this time.
      // The tokens of this ProcessInstance should not show as ActiveTokens.
      await executeSampleProcess();

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id);

      should(activeTokens).be.an.Array();
      should(activeTokens).have.a.lengthOf(1);

      const activeToken = activeTokens[0];

      assertActiveToken(activeToken, userTask1Id);
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
      const initialToken = {
        user_task: true,
      };

      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 suspended tasks after this (2 per instance).
      for(let i = 0; i < 5; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId, initialToken);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 10);
    });

    it('should apply no limit, an offset of 2 and return 3 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id, 2);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(3);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id, 0, 2);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 2, a limit of 2 and return 2 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id, 2, 2);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(2);
    });

    it('should apply an offset of 2, a limit of 5 and return 3 items', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id, 2, 5);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id, 0, 20);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(5);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const activeTokens = await testFixtureProvider
        .managementApiClient
        .getActiveTokensForFlowNode(defaultIdentity, userTask1Id, 1000);

      should(activeTokens).be.an.instanceOf(Array);
      should(activeTokens).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should throw a 401 error when no auth token is provided', async () => {
      try {
        await testFixtureProvider
          .managementApiClient
          .getActiveTokensForFlowNode({}, 'UserTask_1');

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
