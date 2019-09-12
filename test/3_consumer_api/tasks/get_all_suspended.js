const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   GET  ->  /suspended_tasks', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  const processModelId = 'test_consumer_api_all-tasks';

  let correlationId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return all suspended tasks', async () => {

    const taskList = await testFixtureProvider
      .consumerApiClient
      .getAllSuspendedTasks(defaultIdentity);

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
    should(userTask).have.property('tokenPayload');
    should(userTask).not.have.property('processInstanceOwner');
    should(userTask).not.have.property('identity');

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

  it('should fail to retrieve the ProcessModel\'s UserTasks, when the user is forbidden to retrieve it', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getUserTasksForProcessModel(restrictedIdentity, processModelId);

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;

      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve a Users Tasks, when the user is unauthorized', async () => {

    try {
      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks({});

      should.fail(userTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;

      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });
});
