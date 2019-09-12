const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   GET  ->  /correlations/:correlation_id/tasks', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_all-tasks';
  const processModelIdNoTasks = 'test_consumer_api_usertask_empty';
  const processModelIdCallActivity = 'test_consumer_api_task_call_activity';

  let correlationId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([
      processModelId,
      processModelIdNoTasks,
      processModelIdCallActivity,
    ]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should fail to retrieve the Correlation\'s Tasks, when the user is unauthorized', async () => {

    try {
      const taskList = await testFixtureProvider
        .consumerApiClient
        .getTasksForCorrelation({}, correlationId);

      should.fail(taskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to retrieve the Correlation\'s Tasks, when the user is forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const taskList = await testFixtureProvider
        .consumerApiClient
        .getTasksForCorrelation(restrictedIdentity, correlationId);

      should.fail(taskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;

      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should return a Correlation\'s Tasks by its CorrelationId', async () => {

    const taskList = await testFixtureProvider
      .consumerApiClient
      .getTasksForCorrelation(defaultIdentity, correlationId);

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

  it('should return a list of Tasks from a call activity, by the given correlationId', async () => {

    const processStartResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdCallActivity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(processStartResult.correlationId, processModelId, 3);

    const taskList = await testFixtureProvider
      .consumerApiClient
      .getTasksForCorrelation(defaultIdentity, processStartResult.correlationId);

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

  it('should return an empty Array, if the given correlation does not have any Tasks', async () => {

    return new Promise(async (resolve, reject) => {
      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoTasks);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoTasks);

      // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getTasksForCorrelation(defaultIdentity, result.correlationId);

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

  it('should return an empty Array, if the correlationId does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const taskList = await testFixtureProvider
      .consumerApiClient
      .getTasksForCorrelation(defaultIdentity, invalidCorrelationId);

    should(taskList).have.property('userTasks');
    should(taskList.userTasks).be.instanceOf(Array);
    should(taskList.userTasks.length).be.equal(0);

    should(taskList).have.property('manualTasks');
    should(taskList.manualTasks).be.instanceOf(Array);
    should(taskList.manualTasks.length).be.equal(0);

    should(taskList).have.property('emptyActivities');
    should(taskList.emptyActivities).be.instanceOf(Array);
    should(taskList.emptyActivities.length).be.equal(0);
  });
});
