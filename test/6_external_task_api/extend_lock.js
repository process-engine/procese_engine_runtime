'use strict';

const moment = require('moment');
const should = require('should');
const uuid = require('uuid');

const ProcessInstanceHandler = require('../../dist/commonjs').ProcessInstanceHandler;
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('ExternalTask API:   POST  ->  /worker/:worker_id/task/:external_task_id/extend_lock', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  let externalTaskId;

  const processModelId = 'external_task_sample';
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

    externalTaskId = await createWaitingExternalTask();
  });

  after(async () => {

    await testFixtureProvider
      .externalTaskApiClientService
      .finishExternalTask(defaultIdentity, workerId, externalTaskId, {});

    await testFixtureProvider.tearDown();
  });

  it('should successfully extend the lockout time for the given ExternalTask by five minutes', async () => {

    await testFixtureProvider
      .externalTaskApiClientService
      .extendLock(defaultIdentity, workerId, externalTaskId, additionalLockTimeInMs);

    await assertThatExtensionWasSuccessful(externalTaskId, additionalLockTimeInMs);
  });

  it('should fail to extend the lock, if the given ExternalTaskId does not exist', async () => {

    // Postgres expects a UUID here, so we can't use a simple random string.
    const invalidExternalTaskId = uuid.v4();

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .extendLock(defaultIdentity, workerId, invalidExternalTaskId, additionalLockTimeInMs);

      should.fail(invalidExternalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /not found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to extend the lock, if the ExternalTask is locked for another worker', async () => {

    const invalidworkerId = 'some_other_work';

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .extendLock(defaultIdentity, invalidworkerId, externalTaskId, additionalLockTimeInMs);

      should.fail(externalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 423;
      const expectedErrorMessage = /locked by another worker/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to extend the lock, when the user is unauthorized', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .extendLock({}, workerId, externalTaskId, additionalLockTimeInMs);

      should.fail(externalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail extend the lock, when the user is forbidden to access ExternalTasks', async () => {

    try {
      await testFixtureProvider
        .externalTaskApiClientService
        .extendLock(restrictedIdentity, workerId, externalTaskId, additionalLockTimeInMs);

      should.fail(externalTaskId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function createWaitingExternalTask() {

    const correlationId = uuid.v4();

    testFixtureProvider.executeProcess(processModelId, 'StartEvent_1', correlationId, {});

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const availableExternalTasks = await testFixtureProvider
      .externalTaskApiClientService
      .fetchAndLockExternalTasks(defaultIdentity, workerId, topicName, 1, 0, baseLockDurationInMs);

    should(availableExternalTasks).be.an.Array();
    should(availableExternalTasks.length).be.equal(1);

    return availableExternalTasks[0].id;
  }

  async function assertThatExtensionWasSuccessful(externalTaskIdToAssert) {

    const externalTaskRepository = await testFixtureProvider.resolveAsync('ExternalTaskRepository');

    const externalTask = await externalTaskRepository.getById(externalTaskIdToAssert);

    should.exist(externalTask);

    should(externalTask.workerId).be.equal(workerId);
    should(externalTask.topic).be.equal(topicName);
    should(externalTask.state).be.equal('pending');

    should(externalTask).have.property('flowNodeInstanceId');
    should(externalTask).have.property('correlationId');
    should(externalTask).have.property('processInstanceId');
    should(externalTask).have.property('payload');
    should(externalTask).have.property('createdAt');

    // We can't do an exact match here, because of the time it takes to update the
    // lockExpirationTime and then fetch the ExternalTask through the repository.
    // We can only assert that the lockExpirationTime was pushed past its original setting.
    const now = moment();
    const lockExpirationTime = moment(externalTask.lockExpirationTime);

    const lockExpirationTimeIsFutureDateTime = now.isBefore(lockExpirationTime);
    should(lockExpirationTimeIsFutureDateTime).be.true();

    const diff = lockExpirationTime.diff(now);
    const duration = moment.duration(diff).asMilliseconds(); //eslint-disable-line

    const lockExpirationTimeIsLongerThanBefore = duration > baseLockDurationInMs;

    should(lockExpirationTimeIsLongerThanBefore).be.true();
  }

});
