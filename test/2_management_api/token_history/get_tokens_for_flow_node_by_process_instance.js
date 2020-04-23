'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI: getTokensForFlowNodeByProcessInstanceId', () => {

  let testFixtureProvider;
  let defaultIdentity;
  let processInstanceId;

  const processModelId = 'test_management_api_heatmap_sample';
  const correlationId = uuid.v4();
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);
    const startResponse = await executeSampleProcess();

    processInstanceId = startResponse.processInstanceId;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully read the token history of the given FlowNode of the given ProcessInstance', async () => {

    const expectedTokenTypes = [
      'onEnter',
      'onExit',
    ];

    const tokenHistoryGroup = await testFixtureProvider
      .managementApiClient
      .getTokensForFlowNodeByProcessInstanceId(defaultIdentity, processInstanceId, startEventId);

    should(tokenHistoryGroup).be.an.Object();

    const tokenHistoryList = tokenHistoryGroup[startEventId];

    should(tokenHistoryList.tokenHistoryEntries).be.an.Array();
    should(tokenHistoryList.tokenHistoryEntries).have.a.lengthOf(2, `Not all state changes were persisted for FlowNode ${startEventId}!`);

    for (const tokenType of expectedTokenTypes) {

      const matchingTokenHistoryEntry = tokenHistoryList.tokenHistoryEntries.find((entry) => {
        return entry.tokenEventType === tokenType;
      });

      should.exist(matchingTokenHistoryEntry, `No '${tokenType}' token was persisted for FlowNode ${startEventId}!`);

      should(matchingTokenHistoryEntry.flowNodeId).be.equal(startEventId, 'No FlowNodeId was assigned to the TokenHistory entry!');
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
  });

  it('should return an empty result set, if the ProcessInstance does not exist', async () => {
    const tokenHistories = await testFixtureProvider
      .managementApiClient
      .getTokensForFlowNodeByProcessInstanceId(defaultIdentity, 'invalid_process_instance_id', startEventId);

    should(tokenHistories).be.an.Object();
    should(Object.keys(tokenHistories)).be.empty();
  });

  it('should return an empty result set, if the FlowNode does not exist', async () => {
    const tokenHistories = await testFixtureProvider
      .managementApiClient
      .getTokensForFlowNodeByProcessInstanceId(defaultIdentity, processInstanceId, 'invalid_flow_node_id');

    should(tokenHistories).be.an.Object();
    should(Object.keys(tokenHistories)).be.empty();
  });

  it('should fail to retrieve the token history, when the user is unauthorized', async () => {
    try {
      const tokenHistories = await testFixtureProvider
        .managementApiClient
        .getTokensForFlowNodeByProcessInstanceId({}, processInstanceId);

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
