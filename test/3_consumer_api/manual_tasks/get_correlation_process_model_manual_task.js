'use strict';

const should = require('should');
const uuid = require('uuid');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

const testCase = 'GET  ->  /process_models/:process_model_id/correlations/:correlation_id/manual_tasks';
describe(`Consumer API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_manualtask';
  const processModelIdNoManualTasks = 'test_consumer_api_manualtask_empty';

  let manualTaskToFinishAfterTest;

  const correlationId = uuid.v4();

  before(async() => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelId, processModelIdNoManualTasks]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async() => {
    await finishWaitingManualTasksAfterTests();
    await testFixtureProvider.tearDown();
  });

  async function finishWaitingManualTasksAfterTests() {
    const {flowNodeInstanceId, processInstanceId, correlationId} = manualTaskToFinishAfterTest;

    await testFixtureProvider
      .consumerApiClientService
      .finishManualTask(defaultIdentity, processInstanceId, correlationId, flowNodeInstanceId);
  }

  it('should return a list of ManualTasks for a given process model in a given correlation', async() => {

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(manualTaskList).have.property('manualTasks');

    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.greaterThan(0);

    const manualTask = manualTaskList.manualTasks[0];

    manualTaskToFinishAfterTest = manualTask;

    should(manualTask).have.property('id');
    should(manualTask).have.property('flowNodeInstanceId');
    should(manualTask).have.property('name');
    should(manualTask).have.property('correlationId');
    should(manualTask).have.property('processModelId');
    should(manualTask).have.property('processInstanceId');
    should(manualTask).have.property('tokenPayload');
  });

  it('should return an empty Array, if the given correlation does not have any ManualTasks', async() => {

    await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdNoManualTasks);

    await processInstanceHandler.wait(500);

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModel(defaultIdentity, processModelIdNoManualTasks);

    should(manualTaskList).have.property('manualTasks');
    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.equal(0);
  });

  it('should return an empty Array, if the processModelId does not exist', async() => {

    const invalidProcessModelId = 'invalidProcessModelId';

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModelInCorrelation(defaultIdentity, invalidProcessModelId, correlationId);

    should(manualTaskList).have.property('manualTasks');
    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.equal(0);
  });

  it('should return an empty Array, if the correlationId does not exist', async() => {

    const invalidCorrelationId = 'invalidCorrelationId';

    const manualTaskList = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, invalidCorrelationId);

    should(manualTaskList).have.property('manualTasks');
    should(manualTaskList.manualTasks).be.instanceOf(Array);
    should(manualTaskList.manualTasks.length).be.equal(0);
  });

  it('should fail to retrieve the correlation\'s ManualTasks, when the user is unauthorized', async() => {

    try {
      const manualTaskList = await testFixtureProvider
        .consumerApiClientService
        .getManualTasksForProcessModelInCorrelation({}, processModelId, correlationId);

      should.fail(manualTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the correlation\'s ManualTasks, when the user forbidden to retrieve it', async() => {

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      const manualTaskList = await testFixtureProvider
        .consumerApiClientService
        .getManualTasksForProcessModelInCorrelation(restrictedIdentity, processModelId, correlationId);

      should.fail(manualTaskList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
