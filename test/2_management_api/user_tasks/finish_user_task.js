'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

const testCase = 'POST -> /process_models/:process_model_id/correlations/:correlation_id/user_tasks/:user_task_id/finish';
describe(`Management API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_management_api_usertask';

  let userTaskForBadPathTests;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    userTaskForBadPathTests = await createWaitingUserTask();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createWaitingUserTask() {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskList = await testFixtureProvider
      .managementApiClient
      .getUserTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    return userTaskList.userTasks[0];
  }

  it('should successfully finish the given UserTask.', async () => {

    const userTask = await createWaitingUserTask();

    const {correlationId, flowNodeInstanceId, processInstanceId} = userTask;

    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId, userTaskResult);
    });
  });

  it('should successfully finish the UserTask, if no result is provided', async () => {

    const userTask = await createWaitingUserTask();

    const {correlationId, flowNodeInstanceId, processInstanceId} = userTask;

    const userTaskResult = {};

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId, userTaskResult);
    });
  });

  it('should fail to finish an already finished UserTask.', async () => {

    const userTask = await createWaitingUserTask();

    const {correlationId, flowNodeInstanceId, processInstanceId} = userTask;

    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceId, resolve);

      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId, userTaskResult);
    });

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, userTask.processInstanceId, userTask.correlationId, userTask.flowNodeInstanceId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /processinstance.*?in correlation.*?does not have.*?UserTask/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to finish the UserTask, if the given processInstanceId does not exist', async () => {

    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const invalidprocessInstanceId = 'invalidprocessModelId';

    const correlationId = userTaskForBadPathTests.correlationId;
    const userTaskInstanceId = userTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, invalidprocessInstanceId, correlationId, userTaskInstanceId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /processinstance.*?invalidprocessModelId.*?does not have a usertask/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to finish the UserTask, if the given CorrelationId does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const processInstanceId = userTaskForBadPathTests.processInstanceId;
    const userTaskInstanceId = userTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, processInstanceId, invalidCorrelationId, userTaskInstanceId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /correlation.*?invalidCorrelationId.*?does not have a usertask/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to finish the UserTask, if the given UserTaskInstanceId does not exist', async () => {

    const invalidUserTaskId = 'invalidUserTaskId';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const processInstanceId = userTaskForBadPathTests.processInstanceId;
    const correlationId = userTaskForBadPathTests.correlationId;

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, processInstanceId, correlationId, invalidUserTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /processinstance.*?in correlation.*?does not have.*?usertask/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to finish the UserTask, if the provided result is not an object, but a String', async () => {

    const userTaskResult = {
      formFields: 'i am invalid',
    };

    const processInstanceId = userTaskForBadPathTests.processInstanceId;
    const correlationId = userTaskForBadPathTests.correlationId;
    const userTaskInstanceId = userTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, processInstanceId, correlationId, userTaskInstanceId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /not.*?an object/i;
      const expectedErrorCode = 400;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to finish the UserTask, if the provided result is not an object, but an Array', async () => {

    const userTaskResult = {
      formFields: ['i am invalid'],
    };

    const processInstanceId = userTaskForBadPathTests.processInstanceId;
    const correlationId = userTaskForBadPathTests.correlationId;
    const userTaskInstanceId = userTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask(defaultIdentity, processInstanceId, correlationId, userTaskInstanceId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /not.*?an object/i;
      const expectedErrorCode = 400;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to finish the UserTask, when the user is unauthorized', async () => {

    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const processInstanceId = userTaskForBadPathTests.processInstanceId;
    const correlationId = userTaskForBadPathTests.correlationId;
    const userTaskInstanceId = userTaskForBadPathTests.flowNodeInstanceId;

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask({}, processInstanceId, correlationId, userTaskInstanceId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to finish the UserTask, when the user is forbidden to retrieve it', async () => {

    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const processInstanceId = userTaskForBadPathTests.processInstanceId;
    const correlationId = userTaskForBadPathTests.correlationId;
    const userTaskInstanceId = userTaskForBadPathTests.flowNodeInstanceId;

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      await testFixtureProvider
        .managementApiClient
        .finishUserTask(restrictedIdentity, processInstanceId, correlationId, userTaskInstanceId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access.*?denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });
});
