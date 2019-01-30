'use strict';

const should = require('should');
const uuid = require('node-uuid');
const TestFixtureProvider = require('../../dist/commonjs/test_setup').TestFixtureProvider;

describe('TokenHistory API Tests - ', () => {

  let testFixtureProvider;

  let tokenHistoryApiService;

  const processModelId = 'heatmap_sample';
  const correlationId = uuid.v4();
  const startEventId = 'StartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    tokenHistoryApiService = await testFixtureProvider.resolveAsync('TokenHistoryApiService');

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

      const tokenHistory = await tokenHistoryApiService.getTokensForFlowNode({}, correlationId, processModelId, flowNodeId);

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

  async function executeSampleProcess() {

    const initialToken = {
      user_task: false,
    };

    await testFixtureProvider.executeProcess(processModelId, startEventId, correlationId, initialToken);
  }
});
