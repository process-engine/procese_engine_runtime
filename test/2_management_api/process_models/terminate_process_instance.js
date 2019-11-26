'use strict';

const should = require('should');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe(`ManagementAPI: POST  ->  /process_instance/:process_instance_id/terminate`, () => {

  let testFixtureProvider;
  let processInstanceHandler;
  let defaultIdentity;
  let superAdmin;

  const processModelId = 'test_management_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    superAdmin = testFixtureProvider.identities.superAdmin;

    const processModelsToImport = [
      processModelId,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should stop a previously started process instance, if the user has the required claim to do so.', async () => {
    const returnOn = StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload = {};

    const startResult = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, returnOn);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(startResult.correlationId);

    await testFixtureProvider.managementApiClient.terminateProcessInstance(defaultIdentity, startResult.processInstanceId);

    await new Promise((resolve) => setTimeout(resolve, 250));

    await assertProcessTerminationWasSuccessful(startResult.processInstanceId, defaultIdentity);
  });

  it('should stop a previously started process instance, if the user is a SuperAdmin.', async () => {
    const returnOn = StartCallbackType.CallbackOnProcessInstanceCreated;
    const payload = {};

    const startResult = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(defaultIdentity, processModelId, payload, returnOn);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(startResult.correlationId);

    await testFixtureProvider.managementApiClient.terminateProcessInstance(superAdmin, startResult.processInstanceId);

    await new Promise((resolve) => setTimeout(resolve, 250));

    await assertProcessTerminationWasSuccessful(startResult.processInstanceId, defaultIdentity);

    await assertProcessTerminationWasSuccessful(startResult.processInstanceId, defaultIdentity);
  });

  it('should fail to terminate a ProcessInstance for a normal user, when the ProcessInstance belongs to another user', async () => {

    try {
      const startResult = await testFixtureProvider
        .managementApiClient
        .startProcessInstance(superAdmin, processModelId, {}, StartCallbackType.CallbackOnProcessInstanceCreated);

      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(startResult.correlationId);

      await testFixtureProvider.managementApiClient.terminateProcessInstance(defaultIdentity, startResult.processInstanceId);

      should.fail('processModel', undefined, 'This request should have failed!');
    } catch (error) {
      // The 404 is intentional, to hide the existence of the ProcessInstance from the user entirely.
      const expectedErrorMessage = /not found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to terminate a ProcessInstance, when the ProcessInstance does not exist', async () => {

    try {
      await testFixtureProvider
        .managementApiClient
        .terminateProcessInstance(defaultIdentity, 'randomprocessInstanceId');

      should.fail('processModel', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /No correlations.*?found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to terminate a ProcessInstance, when the user is unauthorized', async () => {

    try {
      // It doesn't matter if the ProcessInstance actually exists at this point.
      // If the user is not authorized, he shouldn't be able to call the route in the first place.
      await testFixtureProvider
        .managementApiClient
        .terminateProcessInstance({}, 'processInstanceId');

      should.fail('processModel', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to terminate a ProcessInstance, if the User does not have the required claim', async () => {

    try {
      // It doesn't matter if the ProcessInstance actually exists at this point.
      // If the user doesn't have the correct claim, he will not be able to run this request at any rate.
      await testFixtureProvider
        .managementApiClient
        .terminateProcessInstance(testFixtureProvider.identities.restrictedUser, 'processInstanceId');

      should.fail('processModel', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  async function assertProcessTerminationWasSuccessful(processInstanceId, expectedOwnerIdentity) {

    const list = await testFixtureProvider.managementApiClient.getUserTasksForProcessInstance(superAdmin, processInstanceId);
    should(list.userTasks.length).be.eql(0);

    const processInstance = await testFixtureProvider.managementApiClient.getProcessInstanceById(superAdmin, processInstanceId);

    should(processInstance.state).be.equal('error');
    should(processInstance.identity).be.eql(expectedOwnerIdentity);
  }

});
