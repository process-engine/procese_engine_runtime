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
      'manual_task_expression_test',
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

    await processInstanceHandler
      .finishManualTaskInCorrelation(identity, manualTask2.processInstanceId, manualTask2.correlationId, manualTask2.flowNodeInstanceId);
  });

  it('should finish two parallel running manual tasks', async () => {

    const processModelId = 'manual_task_parallel_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const currentRunningManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(identity, correlationId);

    should(currentRunningManualTasks).have.property('manualTasks');
    should(currentRunningManualTasks.manualTasks).have.size(2, 'There should be two waiting manual tasks');

    const waitingManualsTasks = currentRunningManualTasks.manualTasks;

    for (const currentWaitingManualTask of waitingManualsTasks) {

      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(identity, currentWaitingManualTask.processInstanceId, correlationId, currentWaitingManualTask.flowNodeInstanceId);
    }
  });

  it('should fail to finish a manual task which is not in a waiting state', async () => {

    const processModelId = 'manual_task_sequential_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const waitingManualTasks = await processInstanceHandler.getWaitingManualTasksForCorrelationId(identity, correlationId);
    const manualTask = waitingManualTasks.manualTasks[0];

    const errorObjectProperties = [
      'name',
      'code',
      'message',
    ];

    const errorName = /.*not.*found/i;
    const errorMessage = /.*Manual_Task_2.*/i;
    const errorCode = 404;

    try {
      // Try to finish the manual task which is currently not waiting
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(identity, manualTask.processInstanceId, correlationId, 'Manual_Task_2');
    } catch (error) {
      should(error).have.properties(...errorObjectProperties);

      should(error.name).be.match(errorName);
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });

  it('should refuse to finish a manual task twice', async () => {

    const processModelId = 'manual_task_sequential_test';
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

    const errorObjectProperties = [
      'name',
      'code',
      'message',
    ];

    const errorMessage = /does not have a ManualTask/i;
    const errorCode = 404;

    await testFixtureProvider
      .consumerApiClientService
      .finishManualTask(identity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(identity, manualTask.processInstanceId, correlationId, manualTask.flowNodeInstanceId);
    } catch (error) {
      should(error).have.properties(...errorObjectProperties);

      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });
});
