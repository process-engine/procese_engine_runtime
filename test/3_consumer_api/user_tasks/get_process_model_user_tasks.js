'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').FixtureProviderConsumerApi;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

describe('Consumer API:   GET  ->  /process_models/:process_model_id/userTasks', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let consumerContext;
  let correlationId;

  const processModelId = 'test_consumer_api_usertask';
  const processModelIdNoUserTasks = 'test_consumer_api_usertask_empty';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    consumerContext = testFixtureProvider.context.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdNoUserTasks,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachUserTask(correlationId);
  });

  after(async () => {
    await finishWaitingUserTasksAfterTests();
    await testFixtureProvider.tearDown();
  });

  async function finishWaitingUserTasksAfterTests() {
    const userTaskId = 'Task_1vdwmn1';
    const userTaskResult = {
      formFields: {
        Form_XGSVBgio: true,
      },
    };

    await testFixtureProvider
      .consumerApiClientService
      .finishUserTask(consumerContext, processModelId, correlationId, userTaskId, userTaskResult);
  }

  it('should return a process model\'s user tasks by its process_model_id through the consumer api', async () => {

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForProcessModel(consumerContext, processModelId);

    should(userTaskList).have.property('userTasks');

    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.greaterThan(0);

    const userTask = userTaskList.userTasks[0];

    should(userTask).have.property('id');
    should(userTask).have.property('correlationId');
    should(userTask).have.property('processModelId');
    should(userTask).have.property('data');

    should(userTask.data).have.property('formFields');
    should(userTask.data.formFields).be.instanceOf(Array);
    should(userTask.data.formFields.length).be.equal(1);

    const formField = userTask.data.formFields[0];

    should(formField).have.property('id');
    should(formField).have.property('type');
    should(formField).have.property('enumValues');
    should(formField).have.property('label');
    should(formField).have.property('defaultValue');
  });

  it('should return an empty user task list, if the given process model does not have any user tasks', async () => {

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdNoUserTasks);

    await processInstanceHandler.wait(500);

    const userTaskList = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForProcessModel(consumerContext, processModelIdNoUserTasks);

    should(userTaskList).have.property('userTasks');
    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.equal(0);
  });

  it('should fail to retrieve the process model\'s user tasks, if the process_model_id does not exist', async () => {

    const invalidprocessModelId = 'invalidprocessModelId';

    try {
      const processModel = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForProcessModel(consumerContext, invalidprocessModelId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /no process instance.*?found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the process model\'s user tasks, when the user is unauthorized', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForProcessModel({}, processModelId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the process model\'s user tasks, when the user forbidden to retrieve it', async () => {

    const restrictedContext = testFixtureProvider.context.restrictedUser;

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForProcessModel(restrictedContext, processModelId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
