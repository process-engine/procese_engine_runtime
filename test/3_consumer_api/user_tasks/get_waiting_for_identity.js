'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   GET  ->  /user_tasks/own', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  const processModelId = 'test_consumer_api_usertask';

  let correlationId;
  let userTaskToCleanupAfterTest;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should return a Users UserTasks by his identity', async () => {

    const userTaskList = await testFixtureProvider
      .consumerApiClient
      .getWaitingUserTasksByIdentity(defaultIdentity);

    should(userTaskList).have.property('userTasks');

    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.greaterThan(0);

    const userTask = userTaskList.userTasks[0];
    userTaskToCleanupAfterTest = userTask;

    should(userTask).have.property('id');
    should(userTask).have.property('flowNodeInstanceId');
    should(userTask).have.property('name');
    should(userTask).have.property('correlationId');
    should(userTask).have.property('processModelId');
    should(userTask).have.property('processInstanceId');
    should(userTask).have.property('tokenPayload');
    should(userTask).not.have.property('processInstanceOwner');
    should(userTask).not.have.property('identity');
  });

  it('should return an empty Array, if the user does not have access to any waiting UserTasks', async () => {

    await processInstanceHandler.wait(500);

    const userTaskList = await testFixtureProvider
      .consumerApiClient
      .getWaitingUserTasksByIdentity(restrictedIdentity);

    should(userTaskList).have.property('userTasks');
    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.equal(0);
  });

  it('should fail to retrieve a Users UserTasks, when the user is unauthorized', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity({});

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function cleanup() {
    return new Promise(async (resolve, reject) => {
      const processInstanceId = userTaskToCleanupAfterTest.processInstanceId;
      const userTaskId = userTaskToCleanupAfterTest.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(userTaskToCleanupAfterTest.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClient
        .finishUserTask(defaultIdentity, processInstanceId, correlationId, userTaskId);
    });
  }
});
