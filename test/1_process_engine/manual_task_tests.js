'use strict';

const uuid = require('uuid');
const should = require('should');

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../dist/commonjs').ProcessInstanceHandler;

describe('Manual Tasks - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let identity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    identity = testFixtureProvider.identities.defaultUser;

    const processDefinitionFiles = [
      'manual_task_test',
      'manual_task_sequential_test',
      'manual_task_parallel_test',
    ];
    await testFixtureProvider.importProcessFiles(processDefinitionFiles);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should finish two sequential manual tasks', async () => {

    const processModelId = 'manual_task_sequential_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    let waitingManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(identity, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.greaterThan(0);

    const manualTask1 = waitingManualTasks.manualTasks[0];

    await processInstanceHandler
      .finishManualTaskInCorrelation(identity, manualTask1.processInstanceId, correlationId, manualTask1.flowNodeInstanceId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    waitingManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(identity, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.greaterThan(0);

    const manualTask2 = waitingManualTasks.manualTasks[0];

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTask2.processInstanceId, resolve);
      await processInstanceHandler
        .finishManualTaskInCorrelation(identity, manualTask2.processInstanceId, manualTask2.correlationId, manualTask2.flowNodeInstanceId);
    });
  });

  it('should finish two parallel running manual tasks', async () => {

    const processModelId = 'manual_task_parallel_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 2);

    const currentRunningManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(identity, correlationId);

    should(currentRunningManualTasks).have.property('manualTasks');
    should(currentRunningManualTasks.manualTasks).have.size(2, 'There should be two waiting manual tasks');

    const waitingManualsTasks = currentRunningManualTasks.manualTasks;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(waitingManualsTasks[0].processInstanceId, resolve);

      for (const manualTask of waitingManualsTasks) {
        await testFixtureProvider
          .consumerApiClientService
          .finishManualTask(identity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);
      }
    });
  });

  it('should fail to finish a non existing ManualTask', async () => {

    const correlationId = uuid.v4();

    const errorName = /.*not.*found/i;
    const errorMessage = /.*Manual_Task_1.*/i;
    const errorCode = 404;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(identity, 'processInstanceId', correlationId, 'Manual_Task_1');
    } catch (error) {
      should(error.name).be.match(errorName);
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });

  it('should refuse to finish a manual task twice', async () => {

    const processModelId = 'manual_task_test';
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
        .consumerApiClientService
        .finishManualTask(identity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);
    });

    const errorMessage = /does not have a ManualTask/i;
    const errorCode = 404;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(identity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);
    } catch (error) {
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });
});
