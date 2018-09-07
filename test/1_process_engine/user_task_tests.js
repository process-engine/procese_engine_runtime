'use strict';

const should = require('should');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;
const startCallbackType = require('@process-engine/consumer_api_contracts').StartCallbackType; //eslint-disable-line

describe('User Tasks - ', () => {

  let testFixtureProvider;

  let consumerContext;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    consumerContext = testFixtureProvider.context.defaultUser;

    const processDefinitionFiles = [
      'user_task_test',
      'user_task_expression_test',
      'user_task_sequential_test',
      'user_task_parallel_test',
    ];
    await testFixtureProvider.importProcessFiles(processDefinitionFiles);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should evaluate expressions in user task form fields.', async () => {

    const processModelId = 'user_task_expression_test';

    const initialToken = {
      inputValues: {},
    };

    const correlationId = await startProcessAndReturnCorrelationId(processModelId, initialToken);
    await waitForProcessInstanceToReachUserTask(correlationId);
    const waitingUserTasks = await getWaitingUserTasksForCorrelationId(correlationId);

    const expectedNumberOfWaitingUserTasks = 1;

    should(waitingUserTasks.userTasks.length).be.equal(expectedNumberOfWaitingUserTasks);

    const expectedLabelValue = 1;
    const expectedDefaultValue = 2;

    const waitingUserTaskFieldLabel = waitingUserTasks.userTasks[0].data.formFields[0].label;
    const waitingUserTaskFieldDefaultValue = waitingUserTasks.userTasks[0].data.formFields[0].defaultValue;

    should(waitingUserTaskFieldLabel).be.equal(expectedLabelValue);
    should(waitingUserTaskFieldDefaultValue).be.equal(expectedDefaultValue);

  });

  it('should finish the user task.', async () => {

    const processModelId = 'user_task_test';

    const initialToken = {
      inputValues: {},
    };

    const correlationId = await startProcessAndReturnCorrelationId(processModelId, initialToken);

    const userTaskId = 'user_task_1';

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    await finishUserTaskInCorrelation(correlationId, processModelId, userTaskId, userTaskInput);
  });

  it('should finish two sequential user tasks', async () => {
    const processModelId = 'user_task_sequential_test';

    const initialToken = {
      inputValues: {},
    };

    const correlationId = await startProcessAndReturnCorrelationId(processModelId, initialToken);

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    await finishUserTaskInCorrelation(correlationId, processModelId, 'User_Task_1', userTaskInput);
    await waitForProcessInstanceToReachUserTask(correlationId);
    await finishUserTaskInCorrelation(correlationId, processModelId, 'User_Task_2', userTaskInput);
  });

  it('should finish two parallel running user tasks', async () => {
    const processModelId = 'user_task_parallel_test';

    const initialToken = {
      inputValues: {},
    };

    const correlationId = await startProcessAndReturnCorrelationId(processModelId, initialToken);

    const currentRunningUserTasks = await getWaitingUserTasksForCorrelationId(correlationId);

    should(currentRunningUserTasks).have.property('userTasks');
    should(currentRunningUserTasks.userTasks).have.size(2, 'There should be two waiting user tasks');

    const waitingUsersTasks = currentRunningUserTasks.userTasks;

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    for (const currentWaitingUserTask of waitingUsersTasks) {

      const currentWaitingUserTaskId = currentWaitingUserTask.id;

      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(consumerContext, processModelId, correlationId, currentWaitingUserTaskId, userTaskInput);
    }
  });

  it('should fail to finish a user task which is not in a waiting state', async () => {
    const processModelId = 'user_task_sequential_test';

    const initialToken = {
      inputValues: {},
    };

    const correlationId = await startProcessAndReturnCorrelationId(processModelId, initialToken);

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    const errorObjectProperties = [
      'name',
      'code',
      'message',
    ];

    const errorName = /.*not.*found/i;
    const errorMessage = /.*User_Task_2.*/i;
    const errorCode = 404;

    try {
      // Try to finish the user task which is currently not waiting
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(consumerContext, processModelId, correlationId, 'User_Task_2', userTaskInput);
    } catch (error) {
      should(error).have.properties(...errorObjectProperties);

      should(error.name).be.match(errorName);
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });

  it('should refuse to finish a user task twice', async () => {
    const processModelId = 'user_task_sequential_test';

    const initialToken = {
      inputValues: {},
    };

    const correlationId = await startProcessAndReturnCorrelationId(processModelId, initialToken);

    const userTaskInput = {
      formFields: {
        Sample_Form_Field: 'Hello',
      },
    };

    const errorObjectProperties = [
      'name',
      'code',
      'message',
    ];

    const errorName = /.*not.*found/i;
    const errorMessage = /.*User_Task_1.*/i;
    const errorCode = 404;

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(consumerContext, processModelId, correlationId, 'User_Task_1', userTaskInput);

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(consumerContext, processModelId, correlationId, 'User_Task_1', userTaskInput);
    } catch (error) {
      should(error).have.properties(...errorObjectProperties);

      should(error.name).be.match(errorName);
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });

  /**
   * Start a process with the given process model id and return the resulting correlation id.
   * @param {TokenObject} initialToken Initial token value.
   */
  async function startProcessAndReturnCorrelationId(processModelId, initialToken) {
    const callbackType = startCallbackType.CallbackOnProcessInstanceCreated;
    const result = await testFixtureProvider
      .consumerApiClientService
      .startProcessInstance(consumerContext, processModelId, 'StartEvent_1', initialToken, callbackType);

    await waitForProcessInstanceToReachUserTask(result.correlationId);

    return result.correlationId;
  }

  /**
   * Periodically checks if a given correlation exists. After a max number of retries has been exceeded, an error is thrown.
   *
   * Background:
   * Since we must always resolve immediately after starting a process instance, it is possible that a process instance/correlation
   * does not yet exist, when we try to query it for user tasks. This can especially be an issue on slower machines.
   * To compensate this, we will periodically query the database for existing flow node instances for the given correlation.
   * When the first suspended flow node instance is found (which is bound to be a user task,
   * since no other flow node instance can be suspended at the moment), we continue the tests.
   *
   * No assertions are made here, because that is the job of the tests themselves.
   * This function just tells the tests that they are good to go.
   *
   * If the maximum number of retries has been exceeded, it is assumed that the process instance failed to start and throw an error.
   *
   * @param {string} correlationId The id of the correlation to wait for.
   */
  async function waitForProcessInstanceToReachUserTask(correlationId) {

    const maxNumberOfRetries = 20;
    const delayBetweenRetriesInMs = 500;

    const flowNodeInstanceService = await testFixtureProvider.resolveAsync('FlowNodeInstanceService');

    for (let i = 0; i < maxNumberOfRetries; i++) {

      await wait(delayBetweenRetriesInMs);

      const flowNodeInstances = await flowNodeInstanceService.querySuspendedByCorrelation(correlationId);

      if (flowNodeInstances && flowNodeInstances.length >= 1) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance likely failed to start!`);
  }

  /**
   * Returns all user tasks that are running with the given correlation id.
   * @param {Object} correlationId correlation id of the process
   */
  async function getWaitingUserTasksForCorrelationId(correlationId) {
    const userTasks = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForCorrelation(consumerContext, correlationId);

    return userTasks;
  }

  /**
   * Finishes a user task and returns the result of it.
   *
   * @param {string} correlationId Correlation id of the process instance with the user task
   * @param {string} processModelId Model id of the process that contains the user task
   * @param {string} userTaskId Identifier of the user task that should be finished
   * @param {object} userTaskInput Form input data for the user task
   * @returns Result of the finished user task
   */
  async function finishUserTaskInCorrelation(correlationId, processModelId, userTaskId, userTaskInput) {
    const waitingUserTasks = await getWaitingUserTasksForCorrelationId(correlationId);

    should(waitingUserTasks).have.property('userTasks');
    should(waitingUserTasks.userTasks).have.size(1, 'The process should have one waiting user task');

    const waitingUserTask = waitingUserTasks.userTasks[0];

    should(waitingUserTask.id).be.equal(userTaskId);

    const userTaskResult = await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(consumerContext, processModelId, correlationId, waitingUserTask.id, userTaskInput);

    return userTaskResult;
  }

  async function wait(timeInMs) {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }
});
