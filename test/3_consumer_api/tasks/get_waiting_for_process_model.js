const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   GET  ->  /process_models/:process_model_id/tasks', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_all-tasks';
  const processModelIdNoTasks = 'test_consumer_api_usertask_empty';

  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdNoTasks,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a ProcessModel\'s Tasks by its ProcessModelId', async () => {

    const taskList = await testFixtureProvider
      .consumerApiClient
      .getTasksForProcessModel(defaultIdentity, processModelId);

    // UserTaskList Checks
    should(taskList).have.property('userTasks');

    should(taskList.userTasks).be.instanceOf(Array);
    should(taskList.userTasks.length).be.greaterThan(0);

    const userTask = taskList.userTasks[0];

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

    // EmptyActivityList Checks
    should(taskList).have.property('emptyActivities');

    should(taskList.emptyActivities).be.instanceOf(Array);
    should(taskList.emptyActivities.length).be.greaterThan(0);

    const emptyActivity = taskList.emptyActivities[0];

    should(emptyActivity).have.property('id');
    should(emptyActivity).have.property('flowNodeInstanceId');
    should(emptyActivity).have.property('name');
    should(emptyActivity).have.property('correlationId');
    should(emptyActivity).have.property('processModelId');
    should(emptyActivity).have.property('processInstanceId');
    should(emptyActivity).have.property('tokenPayload');
    should(emptyActivity).not.have.property('processInstanceOwner');
    should(emptyActivity).not.have.property('identity');

    // ManualTaskList Checks
    should(taskList).have.property('manualTasks');

    should(taskList.manualTasks).be.instanceOf(Array);
    should(taskList.manualTasks.length).be.greaterThan(0);

    const manualTask = taskList.manualTasks[0];

    should(manualTask).have.property('id');
    should(manualTask).have.property('flowNodeInstanceId');
    should(manualTask).have.property('name');
    should(manualTask).have.property('correlationId');
    should(manualTask).have.property('processModelId');
    should(manualTask).have.property('processInstanceId');
    should(manualTask).have.property('tokenPayload');
    should(manualTask).not.have.property('processInstanceOwner');
    should(manualTask).not.have.property('identity');
  });

  it('should return an empty Array, if the given ProcessModel does not have any Tasks', async () => {

    return new Promise(async (resolve, reject) => {
      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoTasks);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoTasks);

      // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getTasksForProcessModel(defaultIdentity, processModelIdNoTasks);

      should(userTaskList).have.property('userTasks');
      should(userTaskList.userTasks).be.instanceOf(Array);
      should(userTaskList.userTasks.length).be.equal(0);

      should(userTaskList).have.property('manualTasks');
      should(userTaskList.manualTasks).be.instanceOf(Array);
      should(userTaskList.manualTasks.length).be.equal(0);

      should(userTaskList).have.property('emptyActivities');
      should(userTaskList.emptyActivities).be.instanceOf(Array);
      should(userTaskList.emptyActivities.length).be.equal(0);

      eventAggregator.publish('/processengine/process/signal/Continue', {});
    });
  });

  it('should return an empty Array, if the process_model_id does not exist', async () => {

    const invalidprocessModelId = 'invalidprocessModelId';

    const userTaskList = await testFixtureProvider
      .consumerApiClient
      .getTasksForProcessModel(defaultIdentity, invalidprocessModelId);

    should(userTaskList).have.property('userTasks');
    should(userTaskList.userTasks).be.instanceOf(Array);
    should(userTaskList.userTasks.length).be.equal(0);

    should(userTaskList).have.property('manualTasks');
    should(userTaskList.manualTasks).be.instanceOf(Array);
    should(userTaskList.manualTasks.length).be.equal(0);

    should(userTaskList).have.property('emptyActivities');
    should(userTaskList.emptyActivities).be.instanceOf(Array);
    should(userTaskList.emptyActivities.length).be.equal(0);
  });

  it('should fail to retrieve the ProcessModel\'s Tasks, when the user is unauthorized', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getTasksForProcessModel({}, processModelId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;

      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the ProcessModel\'s Tasks, when the user is forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getTasksForProcessModel(restrictedIdentity, processModelId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;

      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });
});
