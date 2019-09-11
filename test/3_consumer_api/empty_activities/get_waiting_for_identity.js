'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI:   GET  ->  /empty_activities/own', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let restrictedIdentity;

  const processModelId = 'test_consumer_api_emptyactivity';

  let correlationId;
  let emptyActivityToCleanupAfterTest;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a Users EmptyActivities by his identity', async () => {

    const emptyActivityList = await testFixtureProvider
      .consumerApiClient
      .getWaitingEmptyActivitiesByIdentity(defaultIdentity);

    should(emptyActivityList).have.property('emptyActivities');

    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.greaterThan(0);

    const emptyActivity = emptyActivityList.emptyActivities[0];
    emptyActivityToCleanupAfterTest = emptyActivity;

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
    should(emptyActivityList.emptyActivities).be.instanceOf(Array);
    should(emptyActivityList.emptyActivities.length).be.equal(0);
  });

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
      should(error.code).be.equal(expectedErrorCode);
    }
  });
});
