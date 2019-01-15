'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs');

// NOTE:
// The consumer api alrady contains extensive testing for this, so there is no need to cover everything here.
// We just need to ensure that all commands get passed correctly to the consumer api and leave the rest up to it.
const testCase = 'GET  ->  /process_models/:process_model_id/correlations/:correlation_id/manual_tasks';
describe(`Management API: ${testCase}`, () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId;

  let manualTaskToFinish;

  const processModelId = 'test_management_api_manualtask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a correlation\'s ManualTasks by its correlationId through the consumer api', async () => {

    const manualTaskList = await testFixtureProvider
      .managementApiClientService
      .getManualTasksForCorrelation(testFixtureProvider.identities.defaultUser, correlationId);

    assertmanualTaskList(manualTaskList);
  });

  it('should return a process model\'s ManualTasks by its process_model_id through the consumer api', async () => {

    const manualTaskList = await testFixtureProvider
      .managementApiClientService
      .getManualTasksForProcessModel(testFixtureProvider.identities.defaultUser, processModelId);

    assertmanualTaskList(manualTaskList);
  });

  it('should return a list of ManualTasks for a given process model in a given correlation', async () => {

    const manualTaskList = await testFixtureProvider
      .managementApiClientService
      .getManualTasksForProcessModelInCorrelation(testFixtureProvider.identities.defaultUser, processModelId, correlationId);

    manualTaskToFinish = manualTaskList.manualTasks[0];

    assertmanualTaskList(manualTaskList);
  });

  it('should successfully finish the given ManualTask.', async () => {

    // NOTE: There is a gap between the finishing of the ManualTask and the end of the ProcessInstance.
    // Mocha resolves and disassembles the backend BEFORE the process was finished, thus leading to inconsistent database entries.
    // To avoid a messed up database that could break other tests, we must wait here for the process to finish, before finishing the test.
    return new Promise(async (resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`;
      const evaluationCallback = () => {
        resolve();
      };

      // Subscribe for end of the process
      const eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      const processInstanceId = manualTaskToFinish.processInstanceId;
      const flowNodeInstanceId = manualTaskToFinish.flowNodeInstanceId;

      // Now finish the ManualTask.
      await testFixtureProvider
        .managementApiClientService
        .finishManualTask(testFixtureProvider.identities.defaultUser, processInstanceId, correlationId, flowNodeInstanceId);
    });
  });

  function assertmanualTaskList(manualTaskList) {

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
  }

});
