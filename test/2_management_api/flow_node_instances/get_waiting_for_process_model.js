'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetSuspendedTasksForProcessModel', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_all-tasks';
  const processModelIdNoUserTasks = 'test_management_api_usertask_empty';

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
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    before(async () => {
      const correlationId = uuid.v4();
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 3);
    });

    after(async () => {
      // The tasks must be cleaned up here, so they won't interfere with the pagination tests.
      await testFixtureProvider.clearDatabases();
      const processModelsToImport = [
        processModelId,
        processModelIdNoUserTasks,
      ];
      await testFixtureProvider.importProcessFiles(processModelsToImport);
    });

    it('should return a ProcessModel\'s Tasks by its ProcessModelId through the Management API', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId);

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
      should(task).not.have.property('processInstanceOwner');
      should(task).not.have.property('identity');
    });

    it('should return an empty Array, if the given ProcessModel does not have any Tasks', async () => {

      return new Promise(async (resolve, reject) => {
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoUserTasks);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoUserTasks);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const taskList = await testFixtureProvider
          .managementApiClient
          .getSuspendedTasksForProcessModel(defaultIdentity, processModelIdNoUserTasks);

        should(taskList).have.property('tasks');
        should(taskList.tasks).be.an.instanceOf(Array);
        should(taskList.tasks).have.a.lengthOf(0);

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the process_model_id does not exist', async () => {

      const invalidprocessModelId = 'invalidprocessModelId';

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, invalidprocessModelId);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(0);
    });
  });

  describe('Pagination', () => {

    before(async () => {
      const correlationIdPaginationTest = uuid.v4();
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 3 UserTasks, 3 ManualTasks and 3 EmptyActivities after this.
      for (let i = 0; i < 3; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 9);
    });

    it('should apply no limit, an offset of 4 and return 5 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 4);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).has.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 0, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).has.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 5, 2);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).has.a.lengthOf(2);
    });

    it('should apply an offset of 6, a limit of 5 and return 3 items', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 6, 5);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).has.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 0, 11);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).has.a.lengthOf(9);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 1000);

      should(taskList).have.property('tasks');
      should(taskList.tasks).be.an.instanceOf(Array);
      should(taskList.tasks).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve the ProcessModel\'s Tasks, when the user is unauthorized', async () => {

      try {
        const taskList = await testFixtureProvider
          .managementApiClient
          .getSuspendedTasksForProcessModel({}, processModelId);

        should.fail(taskList, undefined, 'This request should have failed!');
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
        const taskList = await testFixtureProvider
          .managementApiClient
          .getSuspendedTasksForProcessModel(restrictedIdentity, processModelId);

        should.fail(taskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 403;
        const expectedErrorMessage = /access denied/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });
  });
});
