'use strict';

const should = require('should');
const uuid = require('uuid');

const ProcessInstanceHandler = require('../../dist/commonjs').ProcessInstanceHandler;
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('ExternalTask API:   POST  ->  /worker/:worker_id/task/:external_task_id/finish', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  let externalTaskIdHappyPathTest;
  let externalTaskIdBadPathTests;

  const processModelId = 'external_task_sample';
  const workerId = 'finish_task_sample_worker';
  const topicName = 'external_task_sample_topic';
  const samplePayload = {
    result: 'Success!',
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    externalTaskIdHappyPathTest = await createWaitingExternalTask();
    externalTaskIdBadPathTests = await createWaitingExternalTask();
  });

  after(async () => {
    await testFixtureProvider
      .externalTaskApiClientService
      .finishExternalTask(defaultIdentity, workerId, externalTaskIdBadPathTests, samplePayload);

    await testFixtureProvider.tearDown();
  });

  it('should successfully finish the given ExternalTask with the given payload', async () => {

    await testFixtureProvider
      .externalTaskApiClientService
      .finishExternalTask(defaultIdentity, workerId, externalTaskIdHappyPathTest, samplePayload);

    await assertThatFinishingWasSuccessful(externalTaskIdHappyPathTest, samplePayload);
  });

  it('should fail to finish the given ExternalTask, if the ExernalTask is already finished', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .finishExternalTask(defaultIdentity, workerId, externalTaskIdHappyPathTest, samplePayload);

      should.fail(externalTaskIdHappyPathTest, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 410;
      const expectedErrorMessage = /no longer accessible/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the given ExternalTask, if the given ExternalTaskId does not exist', async () => {

    // Postgres expects a UUID here, so we can't use a simple random string.
    const invalidExternalTaskId = uuid.v4();

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .finishExternalTask(defaultIdentity, workerId, invalidExternalTaskId, samplePayload);

      should.fail(invalidExternalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the given ExternalTask, if the ExternalTask is locked for another worker', async () => {

    const invalidworkerId = 'some_other_work';

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .finishExternalTask(defaultIdentity, invalidworkerId, externalTaskIdBadPathTests, samplePayload);

      should.fail(externalTaskIdBadPathTests, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 423;
      const expectedErrorMessage = /locked by another worker/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the given ExternalTask, when the user is unauthorized', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .finishExternalTask({}, workerId, externalTaskIdBadPathTests, samplePayload);

      should.fail(externalTaskIdBadPathTests, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the given ExternalTask, when the user is forbidden to access ExternalTasks', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .finishExternalTask(restrictedIdentity, workerId, externalTaskIdBadPathTests, samplePayload);

      should.fail(externalTaskIdBadPathTests, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function createWaitingExternalTask() {

    const correlationId = uuid.v4();

    testFixtureProvider.executeProcess(processModelId, 'StartEvent_1', correlationId, {test_type: 'without_payload'});

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    await processInstanceHandler.waitForExternalTaskToBeCreated(topicName);

    const availableExternalTasks = await testFixtureProvider
      .externalTaskApiClientService
      .fetchAndLockExternalTasks(defaultIdentity, workerId, topicName, 1, 0, 10000);

    should(availableExternalTasks).be.an.Array();
    should(availableExternalTasks.length).be.equal(1);

    return availableExternalTasks[0].id;
  }

  async function assertThatFinishingWasSuccessful(externalTaskIdToAssert) {

    const externalTaskRepository = await testFixtureProvider.resolveAsync('ExternalTaskRepository');

    const externalTask = await externalTaskRepository.getById(externalTaskIdToAssert);

    should.exist(externalTask);

    should(externalTask.workerId).be.equal(workerId);
    should(externalTask.topic).be.equal(topicName);
    should(externalTask.state).be.equal('finished');
    should(externalTask).have.property('result');
    should(externalTask.result).be.eql(samplePayload);

    should(externalTask).have.property('flowNodeInstanceId');
    should(externalTask).have.property('correlationId');
    should(externalTask).have.property('processInstanceId');
    should(externalTask).have.property('payload');
    should(externalTask).have.property('createdAt');
  }

});
