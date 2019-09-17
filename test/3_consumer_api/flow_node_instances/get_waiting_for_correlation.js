const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API: GetSuspendedTasksForCorrelation', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_all-tasks';
  const processModelIdNoTasks = 'test_consumer_api_usertask_empty';
  const processModelIdCallActivity = 'test_consumer_api_task_call_activity';

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
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
    });

    it('should return a Correlation\'s Tasks by its CorrelationId through the Consumer API', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationId);

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

    it('should return a list of Tasks from a call activity, by the given correlationId through the Consumer API', async () => {

      const processStartResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdCallActivity);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(processStartResult.correlationId, processModelId, 3);

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, processStartResult.correlationId);

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

      await new Promise(async (resolve, reject) => {
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(processStartResult.processInstanceId, resolve);

        await testFixtureProvider
          .consumerApiClient
          .finishUserTask(defaultIdentity, userTask.processInstanceId, userTask.correlationId, userTask.flowNodeInstanceId);

        await testFixtureProvider
          .consumerApiClient
          .finishManualTask(defaultIdentity, manualTask.processInstanceId, manualTask.correlationId, manualTask.flowNodeInstanceId);

        await testFixtureProvider
          .consumerApiClient
          .finishEmptyActivity(defaultIdentity, emptyActivity.processInstanceId, emptyActivity.correlationId, emptyActivity.flowNodeInstanceId);
      });
    });

    it('should return an empty Array, if the given correlation does not have any Tasks', async () => {

      return new Promise(async (resolve, reject) => {
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoTasks);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoTasks);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const taskList = await testFixtureProvider
          .consumerApiClient
          .getSuspendedTasksForCorrelation(defaultIdentity, result.correlationId);

        should(taskList).have.property('userTasks');
        should(taskList.userTasks).be.instanceOf(Array);
        should(taskList.userTasks.length).be.equal(0);

        should(taskList).have.property('manualTasks');
        should(taskList.manualTasks).be.instanceOf(Array);
        should(taskList.manualTasks.length).be.equal(0);

        should(taskList).have.property('emptyActivities');
        should(taskList.emptyActivities).be.instanceOf(Array);
        should(taskList.emptyActivities.length).be.equal(0);

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the correlationId does not exist', async () => {

      const invalidCorrelationId = 'invalidCorrelationId';

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, invalidCorrelationId);

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

  describe('Pagination', () => {

    const correlationIdPaginationTest = uuid.v4();

    before(async () => {
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 3 UserTasks, 3 ManualTasks and 3 Empty Acitvities after this.
      for (let i = 0; i < 3; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 9);
    });

    it('should apply no limit, an offset of 4 and return 5 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 4);

      should(taskList).have.property('userTasks');
      should(taskList.userTasks).be.an.instanceOf(Array);

      should(taskList).have.property('manualTasks');
      should(taskList.manualTasks).be.an.instanceOf(Array);

      should(taskList).have.property('emptyActivities');
      should(taskList.emptyActivities).be.an.instanceOf(Array);

      const amountOfReceivedTasks = taskList.manualTasks.length + taskList.userTasks.length + taskList.emptyActivities.length;
      should(amountOfReceivedTasks).be.equal(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 0, 2);

      should(taskList).have.property('userTasks');
      should(taskList.userTasks).be.an.instanceOf(Array);

      should(taskList).have.property('manualTasks');
      should(taskList.manualTasks).be.an.instanceOf(Array);

      should(taskList).have.property('emptyActivities');
      should(taskList.emptyActivities).be.an.instanceOf(Array);

      const amountOfReceivedTasks = taskList.manualTasks.length + taskList.userTasks.length + taskList.emptyActivities.length;
      should(amountOfReceivedTasks).be.equal(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 5, 2);

      should(taskList).have.property('userTasks');
      should(taskList.userTasks).be.an.instanceOf(Array);

      should(taskList).have.property('manualTasks');
      should(taskList.manualTasks).be.an.instanceOf(Array);

      should(taskList).have.property('emptyActivities');
      should(taskList.emptyActivities).be.an.instanceOf(Array);

      const amountOfReceivedTasks = taskList.manualTasks.length + taskList.userTasks.length + taskList.emptyActivities.length;
      should(amountOfReceivedTasks).be.equal(2);
    });

    it('should apply an offset of 6, a limit of 5 and return 3 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 6, 5);

      should(taskList).have.property('userTasks');
      should(taskList.userTasks).be.an.instanceOf(Array);

      should(taskList).have.property('manualTasks');
      should(taskList.manualTasks).be.an.instanceOf(Array);

      should(taskList).have.property('emptyActivities');
      should(taskList.emptyActivities).be.an.instanceOf(Array);

      const amountOfReceivedTasks = taskList.manualTasks.length + taskList.userTasks.length + taskList.emptyActivities.length;
      should(amountOfReceivedTasks).be.equal(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 0, 11);

      should(taskList).have.property('userTasks');
      should(taskList.userTasks).be.an.instanceOf(Array);

      should(taskList).have.property('manualTasks');
      should(taskList.manualTasks).be.an.instanceOf(Array);

      should(taskList).have.property('emptyActivities');
      should(taskList.emptyActivities).be.an.instanceOf(Array);

      const amountOfReceivedTasks = taskList.manualTasks.length + taskList.userTasks.length + taskList.emptyActivities.length;
      should(amountOfReceivedTasks).be.equal(9);
    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 1000);

      should(taskList).have.property('userTasks');
      should(taskList.userTasks).be.an.instanceOf(Array);
      should(taskList.userTasks).have.a.lengthOf(0);

      should(taskList).have.property('manualTasks');
      should(taskList.manualTasks).be.an.instanceOf(Array);
      should(taskList.manualTasks).have.a.lengthOf(0);

      should(taskList).have.property('emptyActivities');
      should(taskList.emptyActivities).be.an.instanceOf(Array);
      should(taskList.emptyActivities).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
    });

    it('should fail to retrieve the Correlation\'s Tasks, when the user is unauthorized', async () => {

      try {
        const taskList = await testFixtureProvider
          .consumerApiClient
          .getSuspendedTasksForCorrelation({}, correlationId);

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
          .getSuspendedTasksForCorrelation(restrictedIdentity, correlationId);

        should.fail(taskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /access denied/i;
        const expectedErrorCode = 403;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.match(expectedErrorCode);
      }
    });
  });
});