'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API: GetTokensForFlowNode', () => {

  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_management_api_heatmap_sample';
  const correlationId = uuid.v4();
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);
    await executeSampleProcess();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully read the token history for each FlowNode of the executed ProcessModel in the given Correlation', async () => {

    const expectedTokenTypes = [
      'onEnter',
      'onExit',
    ];

    const expectedFlowNodeNames = [
      'StartEvent_1',
      'ExclusiveGateway_0fi1ct7',
      'ScriptTask_1',
      'ServiceTask_1',
      'ExclusiveGateway_134ybqm',
      'EndEvent_0eie6q6',
    ];

    for (const flowNodeId of expectedFlowNodeNames) {

      const tokenHistory = await testFixtureProvider
        .managementApiClient
        .getTokensForFlowNode(defaultIdentity, correlationId, processModelId, flowNodeId);

      should(tokenHistory).be.an.Array();
      should(tokenHistory).have.a.lengthOf(2, `Not all state changes were persisted for FlowNode ${flowNodeId}!`);

      for (const tokenType of expectedTokenTypes) {

        const matchingTokenHistoryEntry = tokenHistory.find((entry) => {
          return entry.tokenEventType === tokenType;
        });

        should.exist(matchingTokenHistoryEntry, `No '${tokenType}' token was persisted for FlowNode ${flowNodeId}!`);

        should(matchingTokenHistoryEntry.flowNodeId).be.equal(flowNodeId, 'No FlowNodeId was assigned to the TokenHistory entry!');
        should(matchingTokenHistoryEntry.correlationId).be.equal(correlationId, 'No CorrelationId was assigned to the TokenHistory entry!');
        should(matchingTokenHistoryEntry.processModelId).be.equal(processModelId, 'No ProcessModelId was assigned to the TokenHistory entry!');

        should(matchingTokenHistoryEntry).have.property('flowNodeInstanceId');
        should(matchingTokenHistoryEntry).have.property('previousFlowNodeInstanceId');
        should(matchingTokenHistoryEntry).have.property('processInstanceId');
        should(matchingTokenHistoryEntry).have.property('identity');
        should(matchingTokenHistoryEntry).have.property('createdAt');
        should(matchingTokenHistoryEntry).have.property('caller');
        should(matchingTokenHistoryEntry).have.property('payload');
      }
    }
  });

  it('should fail to retrieve the token history, if the FlowNode does not exist on the ProcessModel', async () => {
    try {
      const tokenHistories = await testFixtureProvider
        .managementApiClient
        .getTokensForFlowNode(defaultIdentity, processModelId, correlationId, 'non_existing_task');

      should.fail(tokenHistories, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /not.*exist/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the token history, if the Correlation does not exist', async () => {
    try {
      const tokenHistories = await testFixtureProvider
        .managementApiClient
        .getTokensForFlowNode(defaultIdentity, 'invalid_correlation_id', processModelId, 'StartEvent_1');

      should.fail(tokenHistories, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /not.*exist/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the token history, if the ProcessModel does not exist within the given correlatio', async () => {
    try {
      const tokenHistories = await testFixtureProvider
        .managementApiClient
        .getTokensForFlowNode(defaultIdentity, correlationId, 'invalid_process_model', 'StartEvent_1');

      should.fail(tokenHistories, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /not.*exist/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the token history, when the user is unauthorized', async () => {
    try {
      const tokenHistories = await testFixtureProvider
        .managementApiClient
        .getTokensForFlowNode({}, processModelId, correlationId, startEventId);

      should.fail(tokenHistories, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  async function executeSampleProcess() {

    const payload = {
      correlationId: correlationId,
      inputValues: {
        user_task: false,
      },
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const startResponse = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, returnOn, startEventId);

    return startResponse;
  }
});
