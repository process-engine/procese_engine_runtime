'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   GET  ->  /process_models/:process_model_id/userTasks', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_usertask';
  const processModelIdNoUserTasks = 'test_consumer_api_usertask_empty';

  let userTaskToFinishAfterTest;

  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdNoUserTasks,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should return a ProcessModel\'s UserTasks by its ProcessModelId through the consumer api', async () => {

    const userTaskList = await testFixtureProvider
      .consumerApiClient
      .getUserTasksForProcessModel(defaultIdentity, processModelId);

    should(userTaskList).have.property('userTasks');

    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.greaterThan(0);

    const userTask = userTaskList.userTasks[0];

    userTaskToFinishAfterTest = userTaskList.userTasks.find((entry) => {
      return entry.correlationId === correlationId;
    });

    should(userTask).have.property('id');
    should(userTask).have.property('flowNodeInstanceId');
    should(userTask).have.property('name');
    should(userTask).have.property('correlationId');
    should(userTask).have.property('processModelId');
    should(userTask).have.property('processInstanceId');
    should(userTask).have.property('data');
    should(userTask).not.have.property('processInstanceOwner');
    should(userTask).not.have.property('identity');

    should(userTask.data).have.property('formFields');
    should(userTask.data.formFields).be.instanceOf(Array);
    should(userTask.data.formFields.length).be.equal(1);

    const formField = userTask.data.formFields[0];

    should(formField).have.property('id');
    should(formField).have.property('type');
    should(formField).have.property('enumValues');
    should(formField).have.property('label');
    should(formField).have.property('defaultValue');

    should(userTask.data).have.property('description');
    should(userTask.data).have.property('finishedMessage');
    should(userTask.data.description).be.eql('TestDescription');
    should(userTask.data.finishedMessage).be.eql('TestFinishedMessage');
  });

  it('should return an empty Array, if the given ProcessModel does not have any UserTasks', async () => {

    return new Promise(async (resolve, reject) => {
      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoUserTasks);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoUserTasks);

      // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getUserTasksForProcessModel(defaultIdentity, processModelIdNoUserTasks);

      should(userTaskList).have.property('userTasks');
      should(userTaskList.userTasks).be.instanceOf(Array);
      should(userTaskList.userTasks.length).be.equal(0);

      eventAggregator.publish('/processengine/process/signal/Continue', {});
    });
  });

  it('should return an empty Array, if the process_model_id does not exist', async () => {

    const invalidprocessModelId = 'invalidprocessModelId';

    const userTaskList = await testFixtureProvider
      .consumerApiClient
      .getUserTasksForProcessModel(defaultIdentity, invalidprocessModelId);

    should(userTaskList).have.property('userTasks');
    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.equal(0);
  });

  it('should fail to retrieve the ProcessModel\'s UserTasks, when the user is unauthorized', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getUserTasksForProcessModel({}, processModelId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the ProcessModel\'s UserTasks, when the user is forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getUserTasksForProcessModel(restrictedIdentity, processModelId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function cleanup() {

    return new Promise(async (resolve, reject) => {
      const processInstanceId = userTaskToFinishAfterTest.processInstanceId;
      const userTaskId = userTaskToFinishAfterTest.flowNodeInstanceId;
      const userTaskResult = {
        formFields: {
          Form_XGSVBgio: true,
        },
      };

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(userTaskToFinishAfterTest.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClient
        .finishUserTask(defaultIdentity, processInstanceId, userTaskToFinishAfterTest.correlationId, userTaskId, userTaskResult);
    });
  }
});
