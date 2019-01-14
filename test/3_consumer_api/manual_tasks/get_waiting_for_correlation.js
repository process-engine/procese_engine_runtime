'use strict';

const should = require('should');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs');

describe('ConsumerAPI:   GET  ->  /correlations/:correlation_id/manual_tasks', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_manualtask';
  const processModelIdNoManualTasks = 'test_consumer_api_manualtask_empty';
  const processModelIdCallActivity = 'test_consumer_api_manualtask_call_activity';
  const processModelIdCallActivitySubprocess = 'test_consumer_api_manualtask_call_activity_subprocess';

  let correlationId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([
      processModelId,
      processModelIdNoManualTasks,
      processModelIdCallActivity,
      processModelIdCallActivitySubprocess,
    ]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should fail to retrieve the Correlation\'s ManualTasks, when the user is unauthorized', async () => {

    try {
      const manualTaskList = await testFixtureProvider
        .consumerApiClientService
        .getManualTasksForCorrelation({}, correlationId);

      should.fail(manualTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the Correlation\'s ManualTasks, when the user forbidden to retrieve it', async () => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const manualTaskList = await testFixtureProvider
        .consumerApiClientService
        .getManualTasksForCorrelation(restrictedIdentity, correlationId);

      should.fail(manualTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should return a Correlation\'s ManualTasks by its CorrelationId through the ConsumerAPI', async () => {

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForCorrelation(defaultIdentity, correlationId);

    should(manualTaskList).have.property('manualTasks');

    should(manualTaskList.manualTasks).be.instanceOf(Array);
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

    await cleanup(manualTask);
  });

  it('should return a list of ManualTasks from a call activity, by the given correlationId through the ConsumerAPI', async () => {

    const correlationIdCallActivity = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdCallActivity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationIdCallActivity, processModelIdCallActivitySubprocess);

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForCorrelation(defaultIdentity, correlationIdCallActivity);

    should(manualTaskList).have.property('manualTasks');

    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.greaterThan(0);

    const manualTask = manualTaskList.manualTasks[0];

    should(manualTask).have.property('id');
    should(manualTask).have.property('flowNodeInstanceId');
    should(manualTask).have.property('name');
    should(manualTask).have.property('correlationId');
    should(manualTask).have.property('processModelId');
    should(manualTask).have.property('processInstanceId');
    should(manualTask).have.property('tokenPayload');

    await cleanup(manualTask);
  });

  it('should return an empty Array, if the given correlation does not have any ManualTasks', async () => {

    return new Promise(async (resolve, reject) => {
      const correlationId2 = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdNoManualTasks);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId2, processModelIdNoManualTasks);

      // Wait for the ProcessInstance to finish, so it won't interfere with follow-up tests.
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId2, processModelIdNoManualTasks, resolve);

      const manualTaskList = await testFixtureProvider
        .consumerApiClientService
        .getManualTasksForCorrelation(defaultIdentity, processModelIdNoManualTasks);

      should(manualTaskList).have.property('manualTasks');
      should(manualTaskList.manualTasks).be.instanceOf(Array);
      should(manualTaskList.manualTasks.length).be.equal(0);

      eventAggregator.publish('/processengine/process/signal/Continue', {});
    });
  });

  it('should return an empty Array, if the correlationId does not exist', async () => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForCorrelation(defaultIdentity, invalidCorrelationId);

    should(manualTaskList).have.property('manualTasks');
    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.equal(0);
  });

  async function cleanup(manualTask) {
    return new Promise(async (resolve, reject) => {
      const processInstanceId = manualTask.processInstanceId;
      const manualTaskId = manualTask.flowNodeInstanceId;

      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTask.processInstanceId, resolve);

      await testFixtureProvider
        .consumerApiClientService
        .finishManualTask(defaultIdentity, processInstanceId, manualTask.correlationId, manualTaskId);
    });
  }
});
