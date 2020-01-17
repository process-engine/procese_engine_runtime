'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   POST  ->  /external_tasks/:external_task_id/handle_service_error', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  let externalTaskBadPathTests;

  const processModelId = 'test_consumer_api_external_task_sample';
  const processModelIdError = 'test_consumer_api_external_task_error';
  const workerId = 'handle_service_error_sample_worker';
  const topicName = 'external_task_sample_topic';
  const errorCode = 'trololol';
  const errorMessage = 'Red alert';
  const errorDetails = 'Critical error encountered';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await testFixtureProvider.importProcessFiles([processModelId, processModelIdError]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    externalTaskBadPathTests = await createWaitingExternalTask();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully abort the given ExternalTask with a ServiceError', async () => {

    const externalTask = await createWaitingExternalTask();

    await testFixtureProvider
      .consumerApiClient
      .handleServiceError(defaultIdentity, workerId, externalTask.id, errorMessage, errorDetails, errorCode);

    await assertThatErrorHandlingWasSuccessful(externalTask.id);
  });

  it('should abort the given ExternalTask with a ServiceError and continue through an ErrorBoundaryEvent', async () => {

    const topic = 'ServiceErrorTest';
    const externalTask = await createWaitingExternalTask(processModelIdError, {testType: 'service'}, topic);

    return new Promise(async (resolve) => {

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(externalTask.processInstanceId, (message) => {
        should(message.currentToken).match(/service error handled/i);
        resolve();
      });

      await testFixtureProvider
        .consumerApiClient
        .handleServiceError(defaultIdentity, workerId, externalTask.id, errorMessage, errorDetails, 'aTechnicalError');

      await assertThatErrorHandlingWasSuccessful(externalTask.id, 'aTechnicalError', topic);
    });
  });

  it('should fail to abort the given ExternalTask, if the ExernalTask is already aborted', async () => {

    const externalTask = await createWaitingExternalTask();

    await testFixtureProvider
      .consumerApiClient
      .handleServiceError(defaultIdentity, workerId, externalTask.id, errorMessage, errorDetails, errorCode);

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleServiceError(defaultIdentity, workerId, externalTask.id, errorMessage, errorDetails, errorCode);

      should.fail(externalTask.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 410;
      const expectedErrorMessage = /no longer accessible/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, if the given ExternalTaskId does not exist', async () => {

    // Postgres expects a UUID here, so we can't use a simple random string.
    const invalidExternalTaskId = uuid.v4();

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleServiceError(defaultIdentity, workerId, invalidExternalTaskId, errorMessage, errorDetails, errorCode);

      should.fail(invalidExternalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  it('should fail to to abort the given ExternalTask, if the ExternalTask is locked for another worker', async () => {

    const invalidworkerId = 'some_other_work';

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleServiceError(defaultIdentity, invalidworkerId, externalTaskBadPathTests.id, errorMessage, errorDetails, errorCode);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 423;
      const expectedErrorMessage = /locked by another worker/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  it('should fail to to abort the given ExternalTask, when the user is unauthorized', async () => {

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleServiceError({}, workerId, externalTaskBadPathTests.id, errorMessage, errorDetails, errorCode);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  it('should fail to to abort the given ExternalTask, when the user is forbidden to access ExternalTasks', async () => {

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleServiceError(restrictedIdentity, workerId, externalTaskBadPathTests.id, errorMessage, errorDetails, errorCode);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  async function createWaitingExternalTask(processModelToStart, payload, topic) {

    const processModelIdToUse = processModelToStart || processModelId;
    const initialToken = payload || {test_type: 'without_payload'};
    const correlationId = uuid.v4();
    const topicToPoll = topic || topicName;

    processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdToUse, correlationId, initialToken);

    await processInstanceHandler.waitForExternalTaskToBeCreated(topicToPoll);

    const availableExternalTasks = await testFixtureProvider
      .consumerApiClient
      .fetchAndLockExternalTasks(defaultIdentity, workerId, topicToPoll, 1, 0, 10000);

    should(availableExternalTasks).be.an.Array();
    should(availableExternalTasks).have.a.lengthOf(1);

    return availableExternalTasks[0];
  }

  async function assertThatErrorHandlingWasSuccessful(externalTaskIdToAssert, expectedCode, topic) {

    const expectedErrorCode = expectedCode || errorCode;
    const expectedTopic = topic || topicName;

    const externalTaskRepository = await testFixtureProvider.resolveAsync('ExternalTaskRepository');

    const externalTask = await externalTaskRepository.getById(externalTaskIdToAssert);

    should.exist(externalTask);

    should(externalTask.workerId).be.equal(workerId);
    should(externalTask.topic).be.equal(expectedTopic);
    should(externalTask.state).be.equal('finished');
    should(externalTask).have.property('error');
    should(externalTask.error.code).match(expectedErrorCode);
    should(externalTask.error.message).match(/red alert/i);
    should(externalTask.error.additionalInformation).be.equal(errorDetails); //eslint-disable-line

    should(externalTask).have.property('flowNodeInstanceId');
    should(externalTask).have.property('correlationId');
    should(externalTask).have.property('processInstanceId');
    should(externalTask).have.property('payload');
    should(externalTask).have.property('createdAt');
  }
});
