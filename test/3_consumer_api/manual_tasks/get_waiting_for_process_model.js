'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   GET  ->  /process_models/:process_model_id/manual_tasks', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_manualtask';
  const processModelIdNoManualTasks = 'test_consumer_api_manualtask_empty';

  let manualTaskToFinishAfterTest;

  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdNoManualTasks,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should return a ProcessModel\'s ManualTasks by its ProcessModelId through the consumer api', async () => {

    const manualTaskList = await testFixtureProvider
      .consumerApiClient
      .getManualTasksForProcessModel(defaultIdentity, processModelId);

    should(manualTaskList).have.property('manualTasks');

    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.greaterThan(0);

    const manualTask = manualTaskList.manualTasks[0];

    manualTaskToFinishAfterTest = manualTaskList.manualTasks.find((entry) => {
      return entry.correlationId === correlationId;
    });

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

  it('should return an empty Array, if the given ProcessModel does not have any ManualTasks', async () => {

    return new Promise(async (resolve, reject) => {
      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoManualTasks);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoManualTasks);

      // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getManualTasksForProcessModel(defaultIdentity, processModelIdNoManualTasks);

      should(manualTaskList).have.property('manualTasks');
      should(manualTaskList.manualTasks).be.instanceOf(Array);
      should(manualTaskList.manualTasks.length).be.equal(0);

      eventAggregator.publish('/processengine/process/signal/Continue', {});
    });
  });

  it('should return an empty Array, if the process_model_id does not exist', async () => {

    const invalidprocessModelId = 'invalidprocessModelId';

    const manualTaskList = await testFixtureProvider
      .consumerApiClient
      .getManualTasksForProcessModel(defaultIdentity, invalidprocessModelId);

    should(manualTaskList).have.property('manualTasks');
    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.equal(0);
  });

  it('should fail to retrieve the ProcessModel\'s ManualTasks, when the user is unauthorized', async () => {

    try {
      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getManualTasksForProcessModel({}, processModelId);

      should.fail(manualTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the ProcessModel\'s ManualTasks, when the user is forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getManualTasksForProcessModel(restrictedIdentity, processModelId);

      should.fail(manualTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  async function cleanup() {
    return new Promise(async (resolve, reject) => {
      const processInstanceId = manualTaskToFinishAfterTest.processInstanceId;
      const manualTaskId = manualTaskToFinishAfterTest.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTaskToFinishAfterTest.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClient
        .finishManualTask(defaultIdentity, processInstanceId, manualTaskToFinishAfterTest.correlationId, manualTaskId);
    });
  }

});
