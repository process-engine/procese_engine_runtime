'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('ExternalTask API:   POST  ->  /worker/:worker_id/task/:external_task_id/handle_bpmn_error', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  let externalTaskHappyPathTest;
  let externalTaskBadPathTests;

  const processModelId = 'external_task_sample';
  const workerId = 'handle_bpmn_error_sample_worker';
  const topicName = 'external_task_sample_topic';
  const errorCode = 'Red alert';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    externalTaskHappyPathTest = await createWaitingExternalTask();
    externalTaskBadPathTests = await createWaitingExternalTask();
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should successfully abort the given ExternalTask with a BPMN Error', async () => {

    await testFixtureProvider
      .externalTaskApiClientService
      .handleBpmnError(defaultIdentity, workerId, externalTaskHappyPathTest.id, errorCode);

    await assertThatErrorHandlingWasSuccessful(externalTaskHappyPathTest.id, errorCode);
  });

  it('should fail to abort the given ExternalTask, if the ExernalTask is already aborted', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .handleBpmnError(defaultIdentity, workerId, externalTaskHappyPathTest.id, errorCode);

      should.fail(externalTaskHappyPathTest.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 410;
      const expectedErrorMessage = /no longer accessible/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, if the given ExternalTaskId does not exist', async () => {

    // Postgres expects a UUID here, so we can't use a simple random string.
    const invalidExternalTaskId = uuid.v4();

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .handleBpmnError(defaultIdentity, workerId, invalidExternalTaskId, errorCode);

      should.fail(invalidExternalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, if the ExternalTask is locked for another worker', async () => {

    const invalidworkerId = 'some_other_work';

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .handleBpmnError(defaultIdentity, invalidworkerId, externalTaskBadPathTests.id, errorCode);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 423;
      const expectedErrorMessage = /locked by another worker/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, when the user is unauthorized', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .handleBpmnError({}, workerId, externalTaskBadPathTests.id, errorCode);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to abort the given ExternalTask, when the user is forbidden to access ExternalTasks', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .handleBpmnError(restrictedIdentity, workerId, externalTaskBadPathTests.id, errorCode);

      should.fail(externalTaskBadPathTests.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function createWaitingExternalTask() {

    const correlationId = uuid.v4();

    testFixtureProvider.executeProcess(processModelId, 'StartEvent_1', correlationId, {test_type: 'without_payload'});

    await processInstanceHandler.waitForExternalTaskToBeCreated(topicName);

    const availableExternalTasks = await testFixtureProvider
      .externalTaskApiClientService
      .fetchAndLockExternalTasks(defaultIdentity, workerId, topicName, 1, 0, 10000);

    should(availableExternalTasks).be.an.Array();
    should(availableExternalTasks.length).be.equal(1);

    return availableExternalTasks[0];
  }

  async function assertThatErrorHandlingWasSuccessful(externalTaskIdToAssert) {

    const externalTaskRepository = await testFixtureProvider.resolveAsync('ExternalTaskRepository');

    const externalTask = await externalTaskRepository.getById(externalTaskIdToAssert);

    should.exist(externalTask);

    should(externalTask.workerId).be.equal(workerId);
    should(externalTask.topic).be.equal(topicName);
    should(externalTask.state).be.equal('finished');
    should(externalTask).have.property('error');
    should(externalTask.error.message).be.match(/red alert/i);

    should(externalTask).have.property('flowNodeInstanceId');
    should(externalTask).have.property('correlationId');
    should(externalTask).have.property('processInstanceId');
    should(externalTask).have.property('payload');
    should(externalTask).have.property('createdAt');
  }

  async function cleanup() {
    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(externalTaskBadPathTests.processInstanceId, resolve);

      await testFixtureProvider
        .externalTaskApiClientService
        .finishExternalTask(defaultIdentity, workerId, externalTaskBadPathTests.id, {});
    });
  }

});
