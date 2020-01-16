'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   POST  ->  /external_tasks/:external_task_id/handle_bpmn_error', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  let externalTaskBadPathTests;

  const processModelId = 'test_consumer_api_external_task_sample';
  const processModelIdError = 'test_consumer_api_external_task_error';
  const workerId = 'handle_bpmn_error_sample_worker';
  const topicName = 'external_task_sample_topic';
  const errorCode = 'Red alert';
  const errorMessage = 'Red alert';

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

  it('should successfully abort the given ExternalTask with a BPMN Error', async () => {

    const externalTask = await createWaitingExternalTask();

    await testFixtureProvider
      .consumerApiClient
      .handleBpmnError(defaultIdentity, workerId, externalTask.id, errorCode, errorMessage);

    await assertThatErrorHandlingWasSuccessful(externalTask.id);
  });

  it('should abort the given ExternalTask with a BPMN Error and continue through an ErrorBoundaryEvent', async () => {

    const topic = 'BpmnErrorTest';
    const externalTask = await createWaitingExternalTask(processModelIdError, {testType: 'bpmn'}, topic);

    return new Promise(async (resolve) => {

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(externalTask.processInstanceId, (message) => {
        should(message.currentToken).match(/bpmn error handled/i);
        resolve();
      });

      await testFixtureProvider
        .consumerApiClient
        .handleBpmnError(defaultIdentity, workerId, externalTask.id, 'aFunctionalError', errorMessage);

      await assertThatErrorHandlingWasSuccessful(externalTask.id, 'aFunctionalError', topic);
    });
  });

  it('should fail to abort the given ExternalTask, if the ExernalTask is already aborted', async () => {

    const externalTask = await createWaitingExternalTask();

    await testFixtureProvider
      .consumerApiClient
      .handleBpmnError(defaultIdentity, workerId, externalTask.id, errorCode, errorMessage);

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleBpmnError(defaultIdentity, workerId, externalTask.id, errorCode, errorMessage);

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
        .handleBpmnError(defaultIdentity, workerId, invalidExternalTaskId, errorCode, errorMessage);

      should.fail(invalidExternalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, if the ExternalTask is locked for another worker', async () => {

    const invalidworkerId = 'some_other_work';

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleBpmnError(defaultIdentity, invalidworkerId, externalTaskBadPathTests.id, errorCode, errorMessage);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 423;
      const expectedErrorMessage = /locked by another worker/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, when the user is unauthorized', async () => {

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleBpmnError({}, workerId, externalTaskBadPathTests.id, errorCode, errorMessage);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, when the user is forbidden to access ExternalTasks', async () => {

    try {
      await testFixtureProvider
        .consumerApiClient
        .handleBpmnError(restrictedIdentity, workerId, externalTaskBadPathTests.id, errorCode, errorMessage);

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

    should(externalTask).have.property('flowNodeInstanceId');
    should(externalTask).have.property('correlationId');
    should(externalTask).have.property('processInstanceId');
    should(externalTask).have.property('payload');
    should(externalTask).have.property('createdAt');
  }
});
