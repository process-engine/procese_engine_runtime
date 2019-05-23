'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

const testCase = 'POST -> /process_models/:process_model_id/correlations/:correlation_id/manual_tasks/:manual_task_id/finish';
describe(`Consumer API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_consumer_api_manualtask';

  let manualTaskForBadPathTests;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    manualTaskForBadPathTests = await createWaitingManualTask();
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  async function createWaitingManualTask() {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    return manualTaskList.manualTasks[0];
  }

  it('should successfully finish the manual task.', async () => {

    const manualTask = await createWaitingManualTask();
    const {correlationId, flowNodeInstanceId, processInstanceId} = manualTask;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId);
    });
  });

  it('should fail to finish an already finished manual task.', async () => {

    const manualTask = await createWaitingManualTask();
    const {correlationId, flowNodeInstanceId, processInstanceId} = manualTask;

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId);
    });

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the manual task, if the given processInstanceId does not exist', async () => {

    const invalidprocessInstanceId = 'invalidprocessInstanceId';

    const correlationId = manualTaskForBadPathTests.correlationId;
    const manualTaskInstanceId = manualTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, invalidprocessInstanceId, correlationId, manualTaskInstanceId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /does not have a ManualTask/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the ManualTask, if the given CorrelationId does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const processInstanceId = manualTaskForBadPathTests.processInstanceId;
    const manualTaskInstanceId = manualTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, invalidCorrelationId, manualTaskInstanceId);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /correlation.*?invalidCorrelationId.*?does not have a manualtask/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the ManualTask, if the given ManualTaskInstanceId does not exist', async () => {

    const invalidManualTaskId = 'invalidManualTaskId';

    const processInstanceId = manualTaskForBadPathTests.processInstanceId;
    const correlationId = manualTaskForBadPathTests.correlationId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, correlationId, invalidManualTaskId);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /processinstance.*?in correlation.*?does not have.*?manualtask/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the manual task, when the user is unauthorized', async () => {

    const processInstanceId = manualTaskForBadPathTests.processInstanceId;
    const correlationId = manualTaskForBadPathTests.correlationId;
    const manualTaskInstanceId = manualTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask({}, processInstanceId, correlationId, manualTaskInstanceId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the manual task, when the user is forbidden to retrieve it', async () => {

    const processInstanceId = manualTaskForBadPathTests.processInstanceId;
    const correlationId = manualTaskForBadPathTests.correlationId;
    const flowNodeInstanceId = manualTaskForBadPathTests.flowNodeInstanceId;

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(restrictedIdentity, processInstanceId, correlationId, flowNodeInstanceId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access.*?denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  async function cleanup() {

    return new Promise(async (resolve, reject) => {
      const processInstanceId = manualTaskForBadPathTests.processInstanceId;
      const manualTaskId = manualTaskForBadPathTests.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTaskForBadPathTests.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, manualTaskForBadPathTests.correlationId, manualTaskId);
    });
  }
});
