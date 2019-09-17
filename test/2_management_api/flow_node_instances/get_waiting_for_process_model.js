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
      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(testFixtureProvider.identities.superAdmin, processModelId);

      for (const userTask of taskList.userTasks) {
        const {correlationId, flowNodeInstanceId, processInstanceId} = userTask;

        await testFixtureProvider
          .managementApiClient
          .finishUserTask(testFixtureProvider.identities.superAdmin, processInstanceId, correlationId, flowNodeInstanceId);
      }

      for (const manualTask of taskList.manualTasks) {
        const {correlationId, flowNodeInstanceId, processInstanceId} = manualTask;

        await testFixtureProvider
          .managementApiClient
          .finishManualTask(testFixtureProvider.identities.superAdmin, processInstanceId, correlationId, flowNodeInstanceId);
      }

      for (const emptyActivity of taskList.emptyActivities) {
        const {correlationId, flowNodeInstanceId, processInstanceId} = emptyActivity;

        await testFixtureProvider
          .managementApiClient
          .finishEmptyActivity(testFixtureProvider.identities.superAdmin, processInstanceId, correlationId, flowNodeInstanceId);
      }
    });

    it('should return a ProcessModel\'s Tasks by its ProcessModelId through the Management API', async () => {

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId);

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
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoUserTasks);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoUserTasks);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const taskList = await testFixtureProvider
          .managementApiClient
          .getSuspendedTasksForProcessModel(defaultIdentity, processModelIdNoUserTasks);

        should(taskList).have.property('userTasks');
        should(taskList.userTasks).be.an.instanceOf(Array);
        should(taskList.userTasks).have.a.lengthOf(0);

        should(taskList).have.property('manualTasks');
        should(taskList.manualTasks).be.an.instanceOf(Array);
        should(taskList.manualTasks).have.a.lengthOf(0);

        should(taskList).have.property('emptyActivities');
        should(taskList.emptyActivities).be.an.instanceOf(Array);
        should(taskList.emptyActivities).have.a.lengthOf(0);

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the process_model_id does not exist', async () => {

      const invalidprocessModelId = 'invalidprocessModelId';

      const taskList = await testFixtureProvider
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, invalidprocessModelId);

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
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 0, 2);

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
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 5, 2);

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
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 6, 5);

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
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 0, 11);

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
        .managementApiClient
        .getSuspendedTasksForProcessModel(defaultIdentity, processModelId, 1000);

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
