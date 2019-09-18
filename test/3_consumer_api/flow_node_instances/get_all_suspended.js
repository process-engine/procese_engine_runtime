const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Consumer API: GetAllSuspendedTasks', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_all-tasks';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([
      processModelId,
    ]);

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

    after(async () => {
      await testFixtureProvider.clearDatabases();
      await testFixtureProvider.importProcessFiles([
        processModelId,
      ]);
    });

    it('should return all suspended tasks', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks(defaultIdentity);

      should(taskList).have.property('tasks');

      should(taskList.tasks).be.instanceOf(Array);
      should(taskList.tasks.length).be.greaterThan(0);

      const task = taskList.tasks[0];

      should(task).have.property('id');
      should(task).have.property('flowNodeInstanceId');
      should(task).have.property('name');
      should(task).have.property('correlationId');
      should(task).have.property('processModelId');
      should(task).have.property('processInstanceId');
      should(task).have.property('tokenPayload');
      should(task).not.have.property('processInstanceOwner');
      should(task).not.have.property('identity');
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

    it('should apply no limit, an offset of 5 and return 4 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks(defaultIdentity, 5);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(4);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks(defaultIdentity, 0, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks(defaultIdentity, 5, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 6, a limit of 5 and return 3 items', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks(defaultIdentity, 6, 5);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks(defaultIdentity, 0, 11);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(9);
    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const taskList = await testFixtureProvider
        .consumerApiClient
        .getAllSuspendedTasks(defaultIdentity, 1000);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(0);
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
          .getAllSuspendedTasks({});

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
          .getAllSuspendedTasks(restrictedIdentity);

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
