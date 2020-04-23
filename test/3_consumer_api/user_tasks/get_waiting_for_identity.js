'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI: GetWaitingUserTasksByIdentity', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;
  let superAdminIdentity;

  const processModelId = 'test_consumer_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;
    superAdminIdentity = testFixtureProvider.identities.superAdmin;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    before(async () => {
      const correlationId = uuid.v4();
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, undefined, defaultIdentity);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should return a Users UserTasks by his identity', async () => {

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(defaultIdentity);

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
      should(userTask).have.property('tokenPayload');
      should(userTask).not.have.property('processInstanceOwner');
      should(userTask).not.have.property('identity');
    });

    it('should return an empty Array, if the user does not have access to any waiting UserTasks', async () => {

      await processInstanceHandler.wait(500);

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(restrictedIdentity);

      should(userTaskList).have.property('userTasks');
      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).be.empty();
    });
  });

  describe('Pagination', () => {

    before(async () => {
      const correlationIdPaginationTest = uuid.v4();
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 UserTasks after this.
      for(let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationIdPaginationTest, undefined, superAdminIdentity);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(superAdminIdentity, 5);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(superAdminIdentity, 0, 2);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(superAdminIdentity, 5, 2);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(superAdminIdentity, 7, 5);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(superAdminIdentity, 0, 20);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const userTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingUserTasksByIdentity(superAdminIdentity, 1000);

      should(userTaskList).have.property('userTasks');

      should(userTaskList.userTasks).be.an.Array();
      should(userTaskList.userTasks).be.empty();
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a Users UserTasks, when the user is unauthorized', async () => {

      try {
        const userTaskList = await testFixtureProvider
          .consumerApiClient
          .getWaitingUserTasksByIdentity({});

        should.fail(userTaskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 401;
        const expectedErrorMessage = /no auth token provided/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });
  });
});
