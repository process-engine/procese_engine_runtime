'use strict';

const uuid = require('node-uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Manual Tasks - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let identity;

  const processModelId = 'manual_task_test';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    identity = testFixtureProvider.identities.defaultUser;

    const processDefinitionFiles = [processModelId];
    await testFixtureProvider.importProcessFiles(processDefinitionFiles);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should finish the ManualTask.', async () => {

    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const waitingManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(identity, correlationId);
    const manualTask = waitingManualTasks.manualTasks[0];

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTask.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClient
        .finishManualTask(identity, manualTask.processInstanceId, manualTask.correlationId, manualTask.flowNodeInstanceId);
    });
  });

  it('should fail to finish a non existing ManualTask', async () => {

    const correlationId = uuid.v4();

    const errorName = /.*not.*found/i;
    const errorMessage = /.*Manual_Task_1.*/i;
    const errorCode = 404;

    try {
      await testFixtureProvider
        .consumerApiClient
        .finishManualTask(identity, 'processInstanceId', correlationId, 'Manual_Task_1');
    } catch (error) {
      should(error.name).be.match(errorName);
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });

  it('should refuse to finish a manual task twice', async () => {

    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const waitingManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(identity, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.greaterThan(0);

    const manualTask = waitingManualTasks.manualTasks[0];

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTask.processInstanceId, resolve);
      await testFixtureProvider
        .consumerApiClient
        .finishManualTask(identity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);
    });

    const errorMessage = /does not have a ManualTask/i;
    const errorCode = 404;

    try {
      await testFixtureProvider
        .consumerApiClient
        .finishManualTask(identity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);
    } catch (error) {
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });
});
