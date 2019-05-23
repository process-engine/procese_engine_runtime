'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   GET  ->  /manual_tasks/own', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  const processModelId = 'test_consumer_api_manualtask';

  let correlationId;
  let manualTaskToCleanupAfterTest;

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

  it('should return a Users ManualTasks by his identity', async () => {

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getWaitingManualTasksByIdentity(defaultIdentity);

    should(manualTaskList).have.property('manualTasks');

    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.greaterThan(0);

    const manualTask = manualTaskList.manualTasks[0];
    manualTaskToCleanupAfterTest = manualTask;

    should(manualTask).have.property('id');
    should(manualTask).have.property('flowNodeInstanceId');
    should(manualTask).have.property('name');
    should(manualTask).have.property('correlationId');
    should(manualTask).have.property('processModelId');
    should(manualTask).have.property('processInstanceId');
    should(manualTask).have.property('tokenPayload');
    should(manualTask).not.have.property('processInstanceOwner');
    should(manualTask).not.have.property('identity');
  });

  it('should return an empty Array, if the user does not have access to any waiting ManualTasks', async () => {

    await processInstanceHandler.wait(500);

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getWaitingManualTasksByIdentity(restrictedIdentity);

    should(manualTaskList).have.property('manualTasks');
    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.equal(0);
  });

  it('should fail to retrieve a Users ManualTasks, when the user is unauthorized', async () => {

    try {
      const manualTaskList = await testFixtureProvider
        .consumerApiClientService
        .getWaitingManualTasksByIdentity({});

      should.fail(manualTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  async function cleanup() {
    return new Promise(async (resolve, reject) => {
      const manualTaskCorrelation = manualTaskToCleanupAfterTest.correlationId;
      const processInstanceId = manualTaskToCleanupAfterTest.processInstanceId;
      const manualTaskId = manualTaskToCleanupAfterTest.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTaskToCleanupAfterTest.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, manualTaskCorrelation, manualTaskId);
    });
  }
});
