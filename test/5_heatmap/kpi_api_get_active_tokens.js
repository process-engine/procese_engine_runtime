'use strict';

const should = require('should');
const uuid = require('uuid');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../dist/commonjs').ProcessInstanceHandler;

describe.only('KPI API -> Get Active Tokens - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let kpiApiService;

  const processModelId = 'heatmap_sample';
  const correlationId = uuid.v4();

  const userTask1Id = 'UserTask_1';
  const userTask2Id = 'UserTask_2';

  const dummyIdentity = {
    token: 'defaultUser',
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    kpiApiService = await testFixtureProvider.resolveAsync('KpiApiService');

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await executeProcessAndWaitForUserTask();
  });

  after(async () => {
    await finishUserTask(userTask1Id);
    await finishUserTask(userTask2Id);
    await testFixtureProvider.tearDown();
  });

  it('should successfully get the active tokens for a running ProcessModel', async () => {

    const activeTokens = await kpiApiService.getActiveTokensForProcessModel(dummyIdentity, processModelId);

    should(activeTokens).be.an.Array();
    should(activeTokens.length).be.equal(2); // 2 UserTasks running in parallel executed branches

    for (const activeToken of activeTokens) {
      assertActiveToken(activeToken, activeToken.flowNodeId);
    }
  });

  it('should successfully get the active tokens for a running FlowNodeInstance', async () => {

    const activeTokens = await kpiApiService.getActiveTokensForFlowNode(dummyIdentity, userTask1Id);

    should(activeTokens).be.an.Array();
    should(activeTokens.length).be.equal(1);

    const activeToken = activeTokens[0];

    assertActiveToken(activeToken, userTask1Id);
  });

  it('should not include tokens from already finished ProcessModels with the same ID', async () => {

    // Execute another ProcessInstance and wait for it to finish this time.
    // The tokens of this ProcessInstance should not show as ActiveTokens.
    await executeSampleProcess();

    const activeTokens = await kpiApiService.getActiveTokensForProcessModel(dummyIdentity, processModelId);

    should(activeTokens).be.an.Array();
    should(activeTokens.length).be.equal(2); // 2 UserTasks running in parallel executed branches

    for (const activeToken of activeTokens) {
      assertActiveToken(activeToken, activeToken.flowNodeId);
    }
  });

  it('should not include tokens from already finished FlowNodeInstances with the same ID', async () => {

    // Execute another ProcessInstance and wait for it to finish this time.
    // The tokens of this ProcessInstance should not show as ActiveTokens.
    await executeSampleProcess();

    const activeTokens = await kpiApiService.getActiveTokensForFlowNode(dummyIdentity, userTask1Id);

    should(activeTokens).be.an.Array();
    should(activeTokens.length).be.equal(1);

    const activeToken = activeTokens[0];

    assertActiveToken(activeToken, userTask1Id);
  });

  async function executeSampleProcess() {

    const startEventId = 'StartEvent_1';
    const initialToken = {
      user_task: false,
    };

    await testFixtureProvider.executeProcess(processModelId, startEventId, correlationId, initialToken);
  }

  async function executeProcessAndWaitForUserTask() {

    const initialToken = {
      user_task: true,
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);
  }

  async function finishUserTask(userTaskId) {

    const userTaskResult = {};

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(testFixtureProvider.context.defaultUser, processModelId, correlationId, userTaskId, userTaskResult);
  }

  function assertActiveToken(activeToken, flowNodeId) {

    const expectedPayload = {
      user_task: true,
    };

    should(activeToken.correlationId).be.equal(correlationId);
    should(activeToken.processModelId).be.equal(processModelId);
    should(activeToken.flowNodeId).be.equal(flowNodeId);
    should(activeToken.identity).be.eql(dummyIdentity);
    should(activeToken.payload).be.eql(expectedPayload);

    should(activeToken).have.property('processInstanceId');
    should(activeToken).have.property('flowNodeInstanceId');
    should(activeToken).have.property('createdAt');
  }
});
