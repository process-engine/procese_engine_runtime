'use strict';

const should = require('should');
const uuid = require('uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs');

describe('Consumer API:   Receive global UserTask Notifications', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_usertask';
  let correlationId;
  let userTaskToFinish;

  const noopCallback = () => {};

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [processModelId];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when UserTask is suspended', async () => {

    correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const notificationReceivedCallback = async (userTaskWaitingMessage) => {

        should.exist(userTaskWaitingMessage);
        // Store this for use in the second test, where we wait for the UserTaskFinished notification.
        userTaskToFinish = userTaskWaitingMessage;

        const userTaskList = await testFixtureProvider
          .consumerApiClientService
          .getUserTasksForProcessModel(defaultIdentity, processModelId);

        const listContainsUserTaskIdFromMessage = userTaskList.userTasks.some((userTask) => {
          return userTask.id === userTaskWaitingMessage.flowNodeId;
        });

        should(listContainsUserTaskIdFromMessage).be.true();

        resolve();
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .consumerApiClientService
        .onUserTaskWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification when UserTask is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationReceived = false;

      const notificationReceivedCallback = async (userTaskFinishedMessage) => {
        should(userTaskFinishedMessage).not.be.undefined();
        should(userTaskFinishedMessage.flowNodeId).be.equal(userTaskToFinish.flowNodeId);
        should(userTaskFinishedMessage.processModelId).be.equal(userTaskToFinish.processModelId);
        should(userTaskFinishedMessage.correlationId).be.equal(userTaskToFinish.correlationId);
        notificationReceived = true;
      };

      testFixtureProvider.consumerApiClientService.onUserTaskFinished(defaultIdentity, notificationReceivedCallback);

      const processFinishedCallback = () => {
        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the finished UserTask!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);
      finishWaitingUserTask();
    });
  });

  it('should fail to subscribe for the UserTaskWaiting notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onUserTaskWaiting({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the UserTaskFinished notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onUserTaskFinished({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  async function finishWaitingUserTask() {
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const processInstanceId = userTaskToFinish.processInstanceId;
    const userTaskInstanceId = userTaskToFinish.flowNodeInstanceId;

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(defaultIdentity, processInstanceId, userTaskToFinish.correlationId, userTaskInstanceId, userTaskResult);
  }

});
