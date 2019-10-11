'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI: GetEmptyActivitiesForProcessModel', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_emptyactivity';
  const processModelIdNoEmptyActivities = 'test_consumer_api_emptyactivity_empty';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
      processModelIdNoEmptyActivities,
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
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    after(async () => {
      // The tasks must be cleaned up here, so they won't interfere with the pagination tests.
      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(testFixtureProvider.identities.superAdmin, processModelId);

      for(const emptyActivity of emptyActivityList.emptyActivities) {
        const {correlationId, flowNodeInstanceId, processInstanceId} = emptyActivity;

        await testFixtureProvider
          .consumerApiClient
          .finishEmptyActivity(testFixtureProvider.identities.superAdmin, processInstanceId, correlationId, flowNodeInstanceId);
      }
    });

    it('should return a ProcessModel\'s EmptyActivities by its ProcessModelId through the consumer api', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId);

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

    it('should return an empty Array, if the given ProcessModel does not have any EmptyActivities', async () => {

      return new Promise(async (resolve, reject) => {
        const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoEmptyActivities);
        await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoEmptyActivities);

        // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
        processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

        const emptyActivityList = await testFixtureProvider
          .consumerApiClient
          .getEmptyActivitiesForProcessModel(defaultIdentity, processModelIdNoEmptyActivities);

        should(emptyActivityList).have.property('emptyActivities');
        should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
        should(emptyActivityList.emptyActivities).have.a.lengthOf(0);

        eventAggregator.publish('/processengine/process/signal/Continue', {});
      });
    });

    it('should return an empty Array, if the process_model_id does not exist', async () => {

      const invalidprocessModelId = 'invalidprocessModelId';

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, invalidprocessModelId);

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
        await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationIdPaginationTest);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdPaginationTest, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId, 5);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId, 0, 2);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId, 5, 2);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId, 7, 5);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId, 0, 20);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId, 1000);

      should(emptyActivityList).have.property('emptyActivities');

      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should fail to retrieve the ProcessModel\'s EmptyActivities, when the user is unauthorized', async () => {

      try {
        const emptyActivityList = await testFixtureProvider
          .consumerApiClient
          .getEmptyActivitiesForProcessModel({}, processModelId);

        should.fail(emptyActivityList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.match(expectedErrorCode);
      }
    });

    it('should return an empty Array, if the user not allowed to access any suspended EmptyActivities', async () => {

      const restrictedIdentity = testFixtureProvider.identities.restrictedUser;
      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(restrictedIdentity, processModelId);

      should(emptyActivityList).have.property('emptyActivities');
      should(emptyActivityList.emptyActivities).be.an.instanceOf(Array);
      should(emptyActivityList.emptyActivities).have.a.lengthOf(0);
    });
  });
});
