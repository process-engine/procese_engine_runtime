'use strict';

const should = require('should');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

const testCase = 'ManagementAPI:   POST  ->  /process_instance/:process_instance_id/terminate';

describe(`ManagementAPI: ${testCase}`, () => {

  let testFixtureProvider;
  let processInstanceHandler;
  let defaultIdentity;

  const processModelId = 'test_management_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should stop a previously started process instance.', async () => {
    const returnOn = StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload = {};

    const startResult = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(defaultIdentity, processModelId, payload, returnOn);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(startResult.correlationId);

    await testFixtureProvider.managementApiClientService.terminateProcessInstance(defaultIdentity, startResult.processInstanceId);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const list = await testFixtureProvider.managementApiClientService.getUserTasksForProcessInstance(defaultIdentity, startResult.processInstanceId);

    should(list.userTasks.length).be.eql(0);
  });

});
