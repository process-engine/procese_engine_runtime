'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   GET  ->  /correlations/:correlation_id/empty_activities', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_emptyactivity';
  const processModelIdNoEmptyActivities = 'test_consumer_api_emptyactivity_empty';
  const processModelIdCallActivity = 'test_consumer_api_emptyactivity_call_activity';

  let correlationId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([
      processModelId,
      processModelIdNoEmptyActivities,
      processModelIdCallActivity,
    ]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should fail to retrieve the Correlation\'s EmptyActivities, when the user is unauthorized', async () => {

    try {
      const emptyActivityList = await testFixtureProvider
        .consumerApiClientService
        .getEmptyActivitiesForCorrelation({}, correlationId);

      should.fail(emptyActivityList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the Correlation\'s EmptyActivities, when the user is forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const emptyActivityList = await testFixtureProvider
        .consumerApiClientService
        .getEmptyActivitiesForCorrelation(restrictedIdentity, correlationId);

      should.fail(emptyActivityList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should return a Correlation\'s EmptyActivities by its CorrelationId through the ConsumerAPI', async () => {

    const emptyActivityList = await testFixtureProvider
      .consumerApiClientService
      .getEmptyActivitiesForCorrelation(defaultIdentity, correlationId);

    should(emptyActivityList).have.property('emptyActivities');

    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.greaterThan(0);

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

    await cleanup(emptyActivity);
  });

  it('should return a list of EmptyActivities from a call activity, by the given correlationId through the ConsumerAPI', async () => {

    const processStartResult = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdCallActivity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(processStartResult.correlationId, processModelId);

    const emptyActivityList = await testFixtureProvider
      .consumerApiClientService
      .getEmptyActivitiesForCorrelation(defaultIdentity, processStartResult.correlationId);

    should(emptyActivityList).have.property('emptyActivities');

    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.greaterThan(0);

    const emptyActivity = emptyActivityList.emptyActivities[0];

    should(emptyActivity).have.property('id');
    should(emptyActivity).have.property('flowNodeInstanceId');
    should(emptyActivity).have.property('name');
    should(emptyActivity).have.property('correlationId');
    should(emptyActivity).have.property('processModelId');
    should(emptyActivity).have.property('processInstanceId');
    should(emptyActivity).have.property('tokenPayload');

    await new Promise((resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processStartResult.processInstanceId, resolve);

      testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, emptyActivity.processInstanceId, emptyActivity.correlationId, emptyActivity.flowNodeInstanceId);
    });
  });

  it('should return an empty Array, if the given correlation does not have any EmptyActivities', async () => {

    return new Promise(async (resolve, reject) => {
      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdNoEmptyActivities);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelIdNoEmptyActivities);

      // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      const emptyActivityList = await testFixtureProvider
        .consumerApiClientService
        .getEmptyActivitiesForCorrelation(defaultIdentity, processModelIdNoEmptyActivities);

      should(emptyActivityList).have.property('emptyActivities');
      should(emptyActivityList.emptyActivities).be.instanceOf(Array);
      should(emptyActivityList.emptyActivities.length).be.equal(0);

      eventAggregator.publish('/processengine/process/signal/Continue', {});
    });
  });

  it('should return an empty Array, if the correlationId does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const emptyActivityList = await testFixtureProvider
      .consumerApiClientService
      .getEmptyActivitiesForCorrelation(defaultIdentity, invalidCorrelationId);

    should(emptyActivityList).have.property('emptyActivities');
    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.equal(0);
  });

  async function cleanup(emptyActivity) {
    return new Promise(async (resolve, reject) => {
      const processInstanceId = emptyActivity.processInstanceId;
      const emptyActivityId = emptyActivity.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivity.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(defaultIdentity, processInstanceId, emptyActivity.correlationId, emptyActivityId);
    });
  }
});
