'use strict';

const moment = require('moment');
const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('DEPRECATED - ExternalTask API Client:  Extend ExternalTask lock', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  let externalTask;

  const processModelId = 'test_consumer_api_external_task_sample';
  const workerId = 'extend_lock_sample_worker';
  const topicName = 'external_task_sample_topic';

  const baseLockDurationInMs = 10000;
  const additionalLockTimeInMs = 300000;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    externalTask = await createWaitingExternalTask();
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should successfully extend the lockout time for the given ExternalTask by five minutes', async () => {

    await testFixtureProvider
      .externalTaskApiClient
      .extendLock(defaultIdentity, workerId, externalTask.id, additionalLockTimeInMs);

    await assertThatExtensionWasSuccessful(externalTask.id, additionalLockTimeInMs);
  });

  it('should fail to extend the lock, if the given ExternalTaskId does not exist', async () => {

    // Postgres expects a UUID here, so we can't use a simple random string.
    const invalidExternalTaskId = uuid.v4();

    try {
      await testFixtureProvider
        .externalTaskApiClient
        .extendLock(defaultIdentity, workerId, invalidExternalTaskId, additionalLockTimeInMs);

      should.fail(invalidExternalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to extend the lock, if the ExternalTask is locked for another worker', async () => {

    const invalidworkerId = 'some_other_work';

    try {
      await testFixtureProvider
        .externalTaskApiClient
        .extendLock(defaultIdentity, invalidworkerId, externalTask.id, additionalLockTimeInMs);

      should.fail(externalTask.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 423;
      const expectedErrorMessage = /locked by another worker/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to extend the lock, when the user is unauthorized', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClient
        .extendLock({}, workerId, externalTask.id, additionalLockTimeInMs);

      should.fail(externalTask.id, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail extend the lock, when the user is forbidden to access ExternalTasks', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClient
        .extendLock(restrictedIdentity, workerId, externalTask.id, additionalLockTimeInMs);

      should.fail(externalTask.id, undefined, 'This request should have failed!');
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
      .externalTaskApiClient
      .fetchAndLockExternalTasks(defaultIdentity, workerId, topicName, 1, 0, baseLockDurationInMs);

    should(availableExternalTasks).be.an.Array();
    should(availableExternalTasks.length).be.equal(1);

    return availableExternalTasks[0];
  }

  async function assertThatExtensionWasSuccessful(externalTaskIdToAssert) {

    const externalTaskRepository = await testFixtureProvider.resolveAsync('ExternalTaskRepository');

    const externalTaskToAssert = await externalTaskRepository.getById(externalTaskIdToAssert);

    should.exist(externalTaskToAssert);

    should(externalTaskToAssert.workerId).be.equal(workerId);
    should(externalTaskToAssert.topic).be.equal(topicName);
    should(externalTaskToAssert.state).be.equal('pending');

    should(externalTaskToAssert).have.property('flowNodeInstanceId');
    should(externalTaskToAssert).have.property('correlationId');
    should(externalTaskToAssert).have.property('processInstanceId');
    should(externalTaskToAssert).have.property('payload');
    should(externalTaskToAssert).have.property('createdAt');

    // We can't do an exact match here, because of the time it takes to update the
    // lockExpirationTime and then fetch the ExternalTask through the repository.
    // We can only assert that the lockExpirationTime was pushed past its original setting.
    const now = moment();
    const lockExpirationTime = moment(externalTaskToAssert.lockExpirationTime);

    const lockExpirationTimeIsFutureDateTime = now.isBefore(lockExpirationTime);
    should(lockExpirationTimeIsFutureDateTime).be.true();

    const diff = lockExpirationTime.diff(now);
    const duration = moment.duration(diff).asMilliseconds(); //eslint-disable-line

    const lockExpirationTimeIsLongerThanBefore = duration > baseLockDurationInMs;

    should(lockExpirationTimeIsLongerThanBefore).be.true();
  }

  async function cleanup() {
    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(externalTask.processInstanceId, resolve);

      await testFixtureProvider
        .externalTaskApiClient
        .finishExternalTask(defaultIdentity, workerId, externalTask.id, {});
    });
  }

});
