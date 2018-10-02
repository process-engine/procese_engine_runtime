'use strict';

const should = require('should');
const uuid = require('uuid');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

describe('Management API:   Receive User Task Notifications', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_usertask';
  const processModelIdNoUserTasks = 'test_consumer_api_usertask_empty';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdNoUserTasks,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function finishWaitingUserTask(correlationId) {
    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .managementApiClientService
      .finishUserTask(defaultIdentity, processModelId, correlationId, userTaskId, userTaskResult);
  }

  it('should send a notification when user task is suspended', async () => {

    const correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const messageReceivedCallback = async (userTaskWaitingMessage) => {

        should.exist(userTaskWaitingMessage);

        const userTaskList = await testFixtureProvider
          .managementApiClientService
          .getUserTasksForProcessModel(defaultIdentity, processModelId);

        const listContainsUserTaskIdFromMessage = userTaskList.userTasks.some((userTask) => {
          return userTask.id === userTaskWaitingMessage.flowNodeId;
        });

        should(listContainsUserTaskIdFromMessage).be.true();

        resolve();
      };

      testFixtureProvider.managementApiClientService.onUserTaskWaiting(messageReceivedCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification when user task is finished', async () => {

    const correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const messageReceivedCallback = async (userTaskFinishedMessage) => {

        const userTaskListAfterFinish = await testFixtureProvider
          .managementApiClientService
          .getUserTasksForProcessModel(defaultIdentity, processModelId);

        should(userTaskFinishedMessage).not.be.undefined();

        const finishedMessageReceivedForUserTaskThatWasWaiting = userTaskListAfterFinish.userTasks.some((userTask) => {
          return userTask.id === userTaskFinishedMessage.flowNodeId;
        });

        should(finishedMessageReceivedForUserTaskThatWasWaiting).be.true();

        resolve();
      };

      testFixtureProvider.managementApiClientService.onUserTaskFinished(messageReceivedCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);
      finishWaitingUserTask(correlationId);
    });
  });

});
