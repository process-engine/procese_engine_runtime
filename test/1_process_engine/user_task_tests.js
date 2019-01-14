'use strict';

const uuid = require('uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

describe('UserTasks - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let identity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    identity = testFixtureProvider.identities.defaultUser;

    const processDefinitionFiles = [
      'user_task_test',
      'user_task_expression_test',
      'user_task_sequential_test',
      'user_task_parallel_test',
    ];
    await testFixtureProvider.importProcessFiles(processDefinitionFiles);
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should evaluate expressions in UserTask form fields.', async () => {

    const processModelId = 'user_task_expression_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const waitingUserTasks = await processInstanceHandler.getWaitingUserTasksForCorrelationId(identity, correlationId);

    const expectedNumberOfWaitingUserTasks = 1;

    should(waitingUserTasks.userTasks.length).be.equal(expectedNumberOfWaitingUserTasks);

    const expectedLabelValue = 1;
    const expectedDefaultValue = 2;

    const userTask = waitingUserTasks.userTasks[0];

    const waitingUserTaskFieldLabel = userTask.data.formFields[0].label;
    const waitingUserTaskFieldDefaultValue = userTask.data.formFields[0].defaultValue;

    should(waitingUserTaskFieldLabel).be.equal(expectedLabelValue);
    should(waitingUserTaskFieldDefaultValue).be.equal(expectedDefaultValue);

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessByInstanceIdToEnd(userTask.processInstanceId, resolve);
      await processInstanceHandler.finishUserTaskInCorrelation(identity, correlationId, userTask.processInstanceId, userTask.flowNodeInstanceId, {});
    });
  });

  it('should finish the UserTask.', async () => {

    const processModelId = 'user_task_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const waitingUserTasks = await processInstanceHandler.getWaitingUserTasksForCorrelationId(identity, correlationId);
    const userTask = waitingUserTasks.userTasks[0];

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessByInstanceIdToEnd(userTask.processInstanceId, resolve);
      await processInstanceHandler
        .finishUserTaskInCorrelation(identity, correlationId, userTask.processInstanceId, userTask.flowNodeInstanceId, userTaskInput);
    });
  });

  it('should finish two sequential UserTasks', async () => {

    const processModelId = 'user_task_sequential_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    let waitingUserTasks = await processInstanceHandler.getWaitingUserTasksForCorrelationId(identity, correlationId);
    const userTask1 = waitingUserTasks.userTasks[0];

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    await processInstanceHandler
      .finishUserTaskInCorrelation(identity, correlationId, userTask1.processInstanceId, userTask1.flowNodeInstanceId, userTaskInput);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    waitingUserTasks = await processInstanceHandler.getWaitingUserTasksForCorrelationId(identity, correlationId);
    const userTask2 = waitingUserTasks.userTasks[0];

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessByInstanceIdToEnd(userTask2.processInstanceId, resolve);
      await processInstanceHandler
        .finishUserTaskInCorrelation(identity, correlationId, userTask2.processInstanceId, userTask2.flowNodeInstanceId, userTaskInput);
    });
  });

  it('should finish two parallel running UserTasks', async () => {

    const processModelId = 'user_task_parallel_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 2);

    const currentRunningUserTasks = await processInstanceHandler.getWaitingUserTasksForCorrelationId(identity, correlationId);

    should(currentRunningUserTasks).have.property('userTasks');
    should(currentRunningUserTasks.userTasks).have.size(2, 'There should be two waiting UserTasks');

    const waitingUsersTasks = currentRunningUserTasks.userTasks;

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessByInstanceIdToEnd(waitingUsersTasks[0].processInstanceId, resolve);

      for (const userTask of waitingUsersTasks) {
        await testFixtureProvider
          .consumerApiClientService
          .finishUserTask(identity, userTask.processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskInput);
      }
    });
  });

  it('should fail to finish a non existing UserTask', async () => {

    const correlationId = uuid.v4();

    const errorName = /.*not.*found/i;
    const errorMessage = /.*User_Task_1.*/i;
    const errorCode = 404;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(identity, 'processInstanceId', correlationId, 'User_Task_1');
    } catch (error) {
      should(error.name).be.match(errorName);
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });

  it('should refuse to finish a UserTask twice', async () => {

    const processModelId = 'user_task_test';
    const correlationId = uuid.v4();
    const initialToken = {
      inputValues: {},
    };

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, initialToken);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const waitingUserTasks = await processInstanceHandler.getWaitingUserTasksForCorrelationId(identity, correlationId);
    const userTask = waitingUserTasks.userTasks[0];

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    const errorMessage = /does not have a usertask/i;
    const errorCode = 404;

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessByInstanceIdToEnd(userTask.processInstanceId, resolve);
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(identity, userTask.processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskInput);
    });

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(identity, userTask.processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskInput);
    } catch (error) {
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });
});
