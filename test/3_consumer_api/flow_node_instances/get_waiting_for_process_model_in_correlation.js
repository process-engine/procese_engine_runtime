const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI: GetSuspendedTasksForProcessModelInCorrelation', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_all-tasks';
  const processModelIdNoTasks = 'test_consumer_api_usertask_empty';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId, processModelIdNoTasks]);

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

    it('should return a list of Tasks for a given process model in a given correlation', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

      should(taskList).have.property('tasks');

      should(taskList.tasks).be.instanceOf(Array);
      should(taskList.tasks.length).be.greaterThan(0);

      const userTask = taskList.tasks[0];

      should(userTask).have.property('id');
      should(userTask).have.property('flowNodeInstanceId');
      should(userTask).have.property('name');
      should(userTask).have.property('correlationId');
      should(userTask).have.property('processModelId');
      should(userTask).have.property('processInstanceId');
      should(userTask).have.property('tokenPayload');
      should(userTask).not.have.property('processInstanceOwner');
      should(userTask).not.have.property('identity');
    });

    it('should return an empty Array, if the given correlation does not have any Tasks', async () => {

      return new Promise(async (resolve, reject) => {
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoTasks);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoTasks);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const taskList = await testFixtureProvider
          .consumerApiClient
          .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelIdNoTasks, correlationId);

        should(taskList).have.property('tasks');
        should(taskList.tasks).be.an.Array();
        should(taskList.tasks).be.empty();

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the processModelId does not exist', async () => {

      const invalidProcessModelId = 'invalidProcessModelId';

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, invalidProcessModelId, correlationId);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).be.empty();
    });

    it('should return an empty Array, if the correlationId does not exist', async () => {

      const invalidCorrelationId = 'invalidCorrelationId';

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, invalidCorrelationId);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).be.empty();
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
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 4);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 0, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 5, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 6, a limit of 5 and return 3 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 6, 5);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 0, 11);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).have.a.lengthOf(9);
    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationIdPaginationTest, 1000);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).be.empty();
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
    });

    it('should fail to retrieve the correlation\'s Tasks, when the user is unauthorized', async () => {

      try {
        const taskList = await testFixtureProvider
          .consumerApiClient
          .getSuspendedTasksForProcessModelInCorrelation({}, processModelId, correlationId);

        should.fail(taskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 401;
        const expectedErrorMessage = /no auth token provided/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });

    it('should return an empty Array, if the user not allowed to access any suspended tasks', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;
      const taskList = await testFixtureProvider
        .consumerApiClient
        .getSuspendedTasksForProcessModelInCorrelation(restrictedIdentity, processModelId, correlationId);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.Array();
      should(taskList.tasks).be.empty();
    });
  });
});
