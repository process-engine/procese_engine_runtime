'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   GET  ->  /process_models/:process_model_id/empty_activities', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_emptyactivity';
  const processModelIdNoEmptyActivities = 'test_consumer_api_emptyactivity_empty';

  let emptyActivityToFinishAfterTest;

  const correlationId = uuid.v4();

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

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await cleanup();
    await testFixtureProvider.tearDown();
  });

  it('should return a ProcessModel\'s EmptyActivities by its ProcessModelId through the consumer api', async () => {

    const emptyActivityList = await testFixtureProvider
      .consumerApiClient
      .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId);

    should(emptyActivityList).have.property('emptyActivities');

    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.greaterThan(0);

    const emptyActivity = emptyActivityList.emptyActivities[0];

    emptyActivityToFinishAfterTest = emptyActivityList.emptyActivities.find((entry) => {
      return entry.correlationId === correlationId;
    });

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
      should(emptyActivityList.emptyActivities).be.instanceOf(Array);
      should(emptyActivityList.emptyActivities.length).be.equal(0);

      eventAggregator.publish('/processengine/process/signal/Continue', {});
    });
  });

  it('should return an empty Array, if the process_model_id does not exist', async () => {

    const invalidprocessModelId = 'invalidprocessModelId';

    const emptyActivityList = await testFixtureProvider
      .consumerApiClient
      .getEmptyActivitiesForProcessModel(defaultIdentity, invalidprocessModelId);

    should(emptyActivityList).have.property('emptyActivities');
    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.equal(0);
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
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the ProcessModel\'s EmptyActivities, when the user is forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const emptyActivityList = await testFixtureProvider
        .consumerApiClient
        .getEmptyActivitiesForProcessModel(restrictedIdentity, processModelId);

      should.fail(emptyActivityList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  async function cleanup() {
    return new Promise(async (resolve, reject) => {
      const processInstanceId = emptyActivityToFinishAfterTest.processInstanceId;
      const emptyActivityId = emptyActivityToFinishAfterTest.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivityToFinishAfterTest.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClient
        .finishEmptyActivity(defaultIdentity, processInstanceId, emptyActivityToFinishAfterTest.correlationId, emptyActivityId);
    });
  }

});
