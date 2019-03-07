'use strict';

const uuid = require('node-uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Empty Activity - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let identity;

  const processModelId = 'empty_activity_test';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    identity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should finish the EmptyActivity.', async () => {

    const startEventIdToUse = 'StartEvent_1';
    const correlationId = uuid.v4();
    const samplePayload = {
      test: 'value',
    };

    testFixtureProvider.executeProcess(processModelId, startEventIdToUse, correlationId, samplePayload);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const waitingEmptyActivities = await processInstanceHandler.getWaitingEmptyActivitiesForCorrelationId(identity, correlationId);
    const emptyActivity = waitingEmptyActivities.emptyActivities[0];

    return new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivity.processInstanceId, resolve);
      await processInstanceHandler
        .finishEmptyActivityInCorrelation(identity, emptyActivity.processInstanceId, correlationId, emptyActivity.flowNodeInstanceId);
    });
  });

  it('should fail to finish a non existing EmptyActivity', async () => {

    const correlationId = uuid.v4();

    const errorName = /.*not.*found/i;
    const errorMessage = /.*EmptyActivityBob.*/i;
    const errorCode = 404;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(identity, 'processInstanceId', correlationId, 'EmptyActivityBob');
    } catch (error) {
      should(error.name).be.match(errorName);
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });

  it('should refuse to finish an EmptyActivity twice', async () => {

    const startEventIdToUse = 'StartEvent_1';
    const correlationId = uuid.v4();
    const samplePayload = {
      test: 'value',
    };

    testFixtureProvider.executeProcess(processModelId, startEventIdToUse, correlationId, samplePayload);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const waitingEmptyActivities = await processInstanceHandler.getWaitingEmptyActivitiesForCorrelationId(identity, correlationId);

    should(waitingEmptyActivities.emptyActivities).be.instanceOf(Array);
    should(waitingEmptyActivities.emptyActivities.length).be.greaterThan(0);

    const emptyActivity = waitingEmptyActivities.emptyActivities[0];

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivity.processInstanceId, resolve);
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(identity, emptyActivity.processInstanceId, correlationId, emptyActivity.flowNodeInstanceId);
    });

    const errorMessage = /does not have an emptyactivity/i;
    const errorCode = 404;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .finishEmptyActivity(identity, emptyActivity.processInstanceId, correlationId, emptyActivity.flowNodeInstanceId);
    } catch (error) {
      should(error.code).be.equal(errorCode);
      should(error.message).be.match(errorMessage);
    }
  });
});
