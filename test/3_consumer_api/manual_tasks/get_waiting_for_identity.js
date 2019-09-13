'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI: GetWaitingManualTasksByIdentity', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;
  let superAdminIdentity;

  const processModelId = 'test_consumer_api_manualtask';

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

    it('should return a Users ManualTasks by his identity', async () => {

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(defaultIdentity);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks.length).be.greaterThan(0);

      const manualTask = manualTaskList.manualTasks[0];

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

    it('should return an empty Array, if the user does not have access to any waiting ManualTasks', async () => {

      await processInstanceHandler.wait(500);

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(restrictedIdentity);

      should(manualTaskList).have.property('manualTasks');
      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(0);
    });
  });

  describe('Pagination', () => {

    before(async () => {
      const correlationIdPaginationTest = uuid.v4();
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 ManualTasks after this.
      for(let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationIdPaginationTest, undefined, superAdminIdentity);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(superAdminIdentity, 5);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(superAdminIdentity, 0, 2);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(superAdminIdentity, 5, 2);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(superAdminIdentity, 7, 5);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(superAdminIdentity, 0, 20);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const manualTaskList = await testFixtureProvider
        .consumerApiClient
        .getWaitingManualTasksByIdentity(superAdminIdentity, 1000);

      should(manualTaskList).have.property('manualTasks');

      should(manualTaskList.manualTasks).be.an.instanceOf(Array);
      should(manualTaskList.manualTasks).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a Users ManualTasks, when the user is unauthorized', async () => {

      try {
        const manualTaskList = await testFixtureProvider
          .consumerApiClient
          .getWaitingManualTasksByIdentity({});

        should.fail(manualTaskList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.match(expectedErrorCode);
      }
    });
  });
});
