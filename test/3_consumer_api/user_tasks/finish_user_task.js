'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

const testCase = 'POST -> /process_models/:process_model_id/correlations/:correlation_id/user_tasks/:user_task_id/finish';
describe(`Consumer API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_consumer_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully finish the given user task.', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(defaultIdentity, processModelId, correlationId, userTaskId, userTaskResult);
  });

  it('should successfully finish the user task, if no result is provided', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {};

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(defaultIdentity, processModelId, correlationId, userTaskId, userTaskResult);
  });

  it('should fail to finish the user task, if the given process_model_id does not exist', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const invalidprocessModelId = 'invalidprocessModelId';

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(defaultIdentity, invalidprocessModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /process model.*?invalidprocessModelId.*?does not have a user task.*?Task_1vdwmn1.*?/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, if the given correlation_id does not exist', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const invalidCorrelationId = 'invalidCorrelationId';

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(defaultIdentity, processModelId, invalidCorrelationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /correlation.*?invalidCorrelationId.*?does not have a user task.*?Task_1vdwmn1.*?/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, if the given user_task_id does not exist', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const invalidUserTaskId = 'invalidUserTaskId';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(defaultIdentity, processModelId, correlationId, invalidUserTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /process model.*?in correlation.*?does not have.*?user task/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish an already finished user task.', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(defaultIdentity, processModelId, correlationId, userTaskId, userTaskResult);

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(defaultIdentity, processModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /process model.*?in correlation.*?does not have.*?user task/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, if the provided result is not an object, but a String', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: 'i am invalid',
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(defaultIdentity, processModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 400;
      const expectedErrorMessage = /not.*?an object/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, if the provided result is not an object, but an Array', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: ['i am invalid'],
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(defaultIdentity, processModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 400;
      const expectedErrorMessage = /not.*?an object/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, when the user is unauthorized', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask({}, processModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, when the user is forbidden to retrieve it', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(restrictedIdentity, processModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access.*?denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
