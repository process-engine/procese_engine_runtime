'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API: GetTokensForCorrelationAndProcessModel', () => {

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

  it('should successfully read the token history for each FlowNode of a specific process model of the executed correlation', async () => {

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

    const tokenHistories = await testFixtureProvider
      .managementApiClient
      .getTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, processModelId);

    for (const expectedFlowNodeName of expectedFlowNodeNames) {
      const tokenHistory = tokenHistories[expectedFlowNodeName];

      should(tokenHistory).be.an.Array();
      should(tokenHistory).have.a.lengthOf(2, `Not all state changes were persisted for FlowNode ${expectedFlowNodeName}!`);

      for (const tokenType of expectedTokenTypes) {

        const matchingTokenHistoryEntry = tokenHistory.find((entry) => {
          return entry.tokenEventType === tokenType;
        });

        should.exist(matchingTokenHistoryEntry, `No '${tokenType}' token was persisted for FlowNode ${expectedFlowNodeName}!`);

        should(matchingTokenHistoryEntry.flowNodeId).be.equal(expectedFlowNodeName, 'No FlowNodeId was assigned to the TokenHistory entry!');
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

  it('should return an empty result set, if the correlation does not exist', async () => {
    const tokenHistories = await testFixtureProvider
      .managementApiClient
      .getTokensForCorrelationAndProcessModel(defaultIdentity, 'invalid_correlation_id', processModelId);

    should(tokenHistories).be.an.Object();
    should(Object.keys(tokenHistories)).have.a.lengthOf(0);
  });

  it('should return an empty result set, if the ProcessModel does not exist', async () => {
    const tokenHistories = await testFixtureProvider
      .managementApiClient
      .getTokensForCorrelationAndProcessModel(defaultIdentity, correlationId, 'invalid_process_model');

    should(tokenHistories).be.an.Object();
    should(Object.keys(tokenHistories)).have.a.lengthOf(0);
  });

  it('should fail to retrieve the token history, when the user is unauthorized', async () => {
    try {
      const tokenHistories = await testFixtureProvider
        .managementApiClient
        .getTokensForCorrelationAndProcessModel({}, correlationId, processModelId);

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
