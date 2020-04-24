'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI: GetUserTasksForCorrelation', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_usertask';
  const processModelIdNoUserTasks = 'test_management_api_usertask_empty';
  const processModelIdCallActivity = 'test_management_api_usertask_call_activity';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([
      processModelId,
      processModelIdNoUserTasks,
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
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should return a Correlation\'s UserTasks by its CorrelationId through the ManagementAPI', async () => {

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, correlationId);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks.length).be.greaterThan(0);

      const userTask = userTaskList.userTasks[0];

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
      should(userTask.data.formFields).be.an.Array();
      should(userTask.data.formFields).have.a.lengthOf(1);

      const formField = userTask.data.formFields[0];

      should(formField).have.property('id');
      should(formField).have.property('type');
      should(formField).have.property('enumValues');
      should(formField).have.property('label');
      should(formField).have.property('defaultValue');
    });

    it('should return a list of UserTasks from a call activity, by the given correlationId through the ManagementAPI', async () => {

      const processStartResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdCallActivity);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(processStartResult.correlationId, processModelId);

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, processStartResult.correlationId);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks.length).be.greaterThan(0);

      const userTask = userTaskList.userTasks[0];

      should(userTask).have.property('id');
      should(userTask).have.property('correlationId');
      should(userTask).have.property('processModelId');
      should(userTask).have.property('data');

      should(userTask.data).have.property('formFields');
      should(userTask.data.formFields).be.an.Array();
      should(userTask.data.formFields).have.a.lengthOf(1);

      const formField = userTask.data.formFields[0];

      should(formField).have.property('id');
      should(formField).have.property('type');
      should(formField).have.property('label');
      should(formField).have.property('defaultValue');

      await new Promise((resolve, reject) => {
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(processStartResult.processInstanceId, resolve);

        testFixtureProvider
          .managementApiClient
          .finishUserTask(defaultIdentity, userTask.processInstanceId, userTask.correlationId, userTask.flowNodeInstanceId);
      });
    });

    it('should return an empty Array, if the given correlation does not have any UserTasks', async () => {

      return new Promise(async (resolve, reject) => {
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoUserTasks);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoUserTasks);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const userTaskList = await testFixtureProvider
          .managementApiClient
          .getUserTasksForCorrelation(defaultIdentity, result.correlationId);


        should(userTaskList).have.property('userTasks');
        should(userTaskList.userTasks).be.an.Array();
        should(userTaskList.userTasks).be.empty();

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the correlationId does not exist', async () => {

      const invalidCorrelationId = 'invalidCorrelationId';

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, invalidCorrelationId);

      should(userTaskList).have.property('userTasks');
      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).be.empty();
    });
  });

  describe('Pagination', () => {

    const correlationIdPaginationTest = uuid.v4();

    before(async () => {
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 UserTasks after this.
      for(let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 5);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 0, 2);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 5, 2);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 7, 5);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 0, 20);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(defaultIdentity, correlationIdPaginationTest, 1000);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).be.empty();
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should fail to retrieve the Correlation\'s UserTasks, when the user is unauthorized', async () => {

      try {
        const userTaskList = await testFixtureProvider
          .managementApiClient
          .getUserTasksForCorrelation({}, correlationId);

        should.fail(userTaskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.match(expectedErrorCode);
      }
    });

    it('should return an empty Array, if the user not allowed to access any suspended UserTasks', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;
      const userTaskList = await testFixtureProvider
        .managementApiClient
        .getUserTasksForCorrelation(restrictedIdentity, correlationId);

      should(userTaskList).have.property('userTasks');
      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).be.empty();
    });
  });
});
