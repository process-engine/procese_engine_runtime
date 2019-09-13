'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI: GetWaitingEmptyActivitiesByIdentity', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;
  let superAdminIdentity;

  const processModelId = 'test_consumer_api_emptyactivity';

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

    it('should return a Users EmptyActivities by his identity', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(defaultIdentity);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(1);

      const emptyActivity = emptyActivityList.emptyActivities[0];

      should(emptyActivity).have.property('id');
      should(emptyActivity).have.property('flowNodeInstanceId');
      should(emptyActivity).have.property('name');
      should(emptyActivity).have.property('correlationId');
      should(emptyActivity).have.property('processModelId');
      should(emptyActivity).have.property('processInstanceId');
      should(emptyActivity).have.property('tokenPayload');
      should(emptyActivity).not.have.property('processInstanceOwner');
      should(emptyActivity).not.have.property('identity');
    });

    it('should return an empty Array, if the user does not have access to any waiting EmptyActivities', async () => {

      await processInstanceHandler.wait(500);

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(restrictedIdentity);

      should(emptyActivityList).have.property('emptyActivities');
      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(0);
    });
  });

  describe('Pagination', () => {

    before(async () => {
      const correlationIdPaginationTest = uuid.v4();
      // Create a number of ProcessInstances, so we can actually test pagination
      // We will have a grand total of 10 EmptyActivities after this.
      for(let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationIdPaginationTest, undefined, superAdminIdentity);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(superAdminIdentity, 5);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(superAdminIdentity, 0, 2);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(superAdminIdentity, 5, 2);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(superAdminIdentity, 7, 5);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(superAdminIdentity, 0, 20);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getWaitingEmptyActivitiesByIdentity(superAdminIdentity, 1000);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a Users EmptyActivities, when the user is unauthorized', async () => {

      try {
        const emptyActivityList = await testFixtureProvider
          .consumerApiClient
          .getWaitingEmptyActivitiesByIdentity({});

        should.fail(emptyActivityList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.match(expectedErrorCode);
      }
    });
  });
});
