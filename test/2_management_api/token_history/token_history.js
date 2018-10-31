'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').ProcessModelExecution.StartCallbackType; //eslint-disable-line

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Management API: GET  ->  /correlation/:correlationId/process_model/:processModelId/flow_node/:flowNodeId/token_history', () => {

  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'heatmap_sample';
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

  it('should successfully read the token history for each FlowNode of the executed correlation', async () => {

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
        .managementApiClientService
        .getTokensForFlowNodeInstance(defaultIdentity, correlationId, processModelId, flowNodeId);

      should(tokenHistory).be.an.Array();
      should(tokenHistory.length).be.equal(2, `Not all state changes were persisted for FlowNode ${flowNodeId}!`);

      for (const tokenType of expectedTokenTypes) {

        const matchingTokenHistoryEntry = tokenHistory.find((entry) => {
          return entry.tokenEventType === tokenType;
        });

        should.exist(matchingTokenHistoryEntry, `No '${tokenType}' token was persisted for FlowNode ${flowNodeId}!`);

        should(matchingTokenHistoryEntry.flowNodeId).be.equal(flowNodeId, 'No FlowNodeId was assigned to the TokenHistory entry!');
        should(matchingTokenHistoryEntry.correlationId).be.equal(correlationId, 'No CorrelationId was assigned to the TokenHistory entry!');
        should(matchingTokenHistoryEntry.processModelId).be.equal(processModelId, 'No ProcessModelId was assigned to the TokenHistory entry!');

        should(matchingTokenHistoryEntry).have.property('flowNodeInstanceId');
        should(matchingTokenHistoryEntry).have.property('processInstanceId');
        should(matchingTokenHistoryEntry).have.property('identity');
        should(matchingTokenHistoryEntry).have.property('createdAt');
        should(matchingTokenHistoryEntry).have.property('caller');
        should(matchingTokenHistoryEntry).have.property('payload');
      }
    }
  });

  it('should fail to retrieve the token history, when the user is unauthorized', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getTokensForFlowNodeInstance({}, processModelId, correlationId, startEventId);

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail when trying to receive the token history of a FlowNode which does not exist in the correlation', async() => {
    const notExistingTaskId = 'not_existing_task';
    try {
      const processTokens = await testFixtureProvider
        .managementApiClientService
        .getTokensForFlowNodeInstance(defaultIdentity, processModelId, correlationId, notExistingTaskId);
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not.*exist/i;
      should(error).has.properties('code', 'message');
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
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

    await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, returnOn);
  }
});
