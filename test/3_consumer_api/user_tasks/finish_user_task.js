'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

const testCase = 'POST -> /process_models/:process_model_id/correlations/:correlation_id/user_tasks/:user_task_id/finish';
describe(`Consumer API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let consumerContext;

  const processModelId = 'test_consumer_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    consumerContext = testFixtureProvider.context.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully finish the given user task.', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(consumerContext, processModelId, correlationId, userTaskId, userTaskResult);
  });

  it('should successfully finish the user task, if no result is provided', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {};

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(consumerContext, processModelId, correlationId, userTaskId, userTaskResult);
  });

  it('should fail to finish the user task, if the given process_model_id does not exist', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

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
        .finishUserTask(consumerContext, invalidprocessModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /no process instance.*?found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, if the given correlation_id does not exist', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

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
        .finishUserTask(consumerContext, processModelId, invalidCorrelationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /no correlation.*?found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to finish the user task, if the given user_task_id does not exist', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

    const invalidUserTaskId = 'invalidUserTaskId';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(consumerContext, processModelId, correlationId, invalidUserTaskId, userTaskResult);

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
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(consumerContext, processModelId, correlationId, userTaskId, userTaskResult);

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(consumerContext, processModelId, correlationId, userTaskId, userTaskResult);

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
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: 'i am invalid',
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(consumerContext, processModelId, correlationId, userTaskId, userTaskResult);

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
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: ['i am invalid'],
    };

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(consumerContext, processModelId, correlationId, userTaskId, userTaskResult);

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
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

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
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);

    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    const restrictedContext = testFixtureProvider.context.restrictedUser;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishUserTask(restrictedContext, processModelId, correlationId, userTaskId, userTaskResult);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access.*?denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
