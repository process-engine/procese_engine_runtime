'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

const testCase = 'POST -> /process_models/:process_model_id/correlations/:correlation_id/empty_activities/:empty_activity_instance_id/finish';
describe(`Consumer API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_consumer_api_emptyactivity';

  let emptyActivityForBadPathTests;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    emptyActivityForBadPathTests = await createWaitingEmptyActivity();
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  async function createWaitingEmptyActivity() {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const emptyActivityList = await testFixtureProvider
      .consumerApiClientService
      .getEmptyActivitiesForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    return emptyActivityList.emptyActivities[0];
  }

  it('should successfully finish the EmptyActivity.', async () => {

    const emptyActivity = await createWaitingEmptyActivity();
    const {correlationId, flowNodeInstanceId, processInstanceId} = emptyActivity;

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId);
    });
  });

  it('should fail to finish an already finished EmptyActivity.', async () => {

    const emptyActivity = await createWaitingEmptyActivity();
    const {correlationId, flowNodeInstanceId, processInstanceId} = emptyActivity;

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId);
    });

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the EmptyActivity, if the given processInstanceId does not exist', async () => {

    const invalidprocessInstanceId = 'invalidprocessInstanceId';

    const correlationId = emptyActivityForBadPathTests.correlationId;
    const emptyActivityInstanceId = emptyActivityForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, invalidprocessInstanceId, correlationId, emptyActivityInstanceId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /does not have an emptyactivity/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the ManualTask, if the given CorrelationId does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const processInstanceId = emptyActivityForBadPathTests.processInstanceId;
    const emptyActivityInstanceId = emptyActivityForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, processInstanceId, invalidCorrelationId, emptyActivityInstanceId);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /correlation.*?invalidCorrelationId.*?does not have an emptyactivity/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the ManualTask, if the given ManualTaskInstanceId does not exist', async () => {

    const invalidManualTaskId = 'invalidManualTaskId';

    const processInstanceId = emptyActivityForBadPathTests.processInstanceId;
    const correlationId = emptyActivityForBadPathTests.correlationId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, processInstanceId, correlationId, invalidManualTaskId);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /processinstance.*?in correlation.*?does not have.*?emptyactivity/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the EmptyActivity, when the user is unauthorized', async () => {

    const processInstanceId = emptyActivityForBadPathTests.processInstanceId;
    const correlationId = emptyActivityForBadPathTests.correlationId;
    const emptyActivityInstanceId = emptyActivityForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity({}, processInstanceId, correlationId, emptyActivityInstanceId);

      should.fail('unexpectedSuccessResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to finish the EmptyActivity, when the user is forbidden to retrieve it', async () => {

    const processInstanceId = emptyActivityForBadPathTests.processInstanceId;
    const correlationId = emptyActivityForBadPathTests.correlationId;
    const flowNodeInstanceId = emptyActivityForBadPathTests.flowNodeInstanceId;

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(restrictedIdentity, processInstanceId, correlationId, flowNodeInstanceId);

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
      const processInstanceId = emptyActivityForBadPathTests.processInstanceId;
      const emptyActivityId = emptyActivityForBadPathTests.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivityForBadPathTests.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, processInstanceId, emptyActivityForBadPathTests.correlationId, emptyActivityId);
    });
  }
});
