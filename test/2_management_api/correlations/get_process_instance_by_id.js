'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI: GetProcessInstanceById', () => {

  let testFixtureProvider;
  let defaultIdentity

  const correlationId = uuid.v4();
  const processModelId = 'test_management_api_generic_sample';
  let processInstanceId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    processInstanceId = await createFinishedProcessInstance(defaultIdentity);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstance(identity) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: correlationId,
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(identity, processModelId, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.processInstanceId;
  }

  it('should return a correlation by its ProcessInstanceId through the ManagementAPI', async () => {

    const processInstance = await testFixtureProvider
      .managementApiClient
      .getProcessInstanceById(defaultIdentity, processInstanceId);

    assertProcessInstance(processInstance);
  });

  it('should return another users Correlation through the ManagementAPI, if the requesting user is a SuperAdmin', async () => {

    const processInstance = await testFixtureProvider
      .managementApiClient
      .getProcessInstanceById(defaultIdentity, processInstanceId);

    assertProcessInstance(processInstance);
  });

  it('should retrieve another users ProcessInstance, if the requesting user is a SuperAdmin', async () => {
    const processInstance = await testFixtureProvider
      .managementApiClient
      .getProcessInstanceById(testFixtureProvider.identities.superAdmin, processInstanceId);

    assertProcessInstance(processInstance);
  });

  it('should throw an error, if a regular user attempts to get the ProcessIntance of another user', async () => {
    try {
      const processInstance = await testFixtureProvider
        .managementApiClient
        .getProcessInstanceById(testFixtureProvider.identities.secondDefaultUser, processInstanceId);

      should.fail(processInstance, undefined, 'This request should have failed, because users cannot access other users ProcessInstances!');
    } catch (error) {
      // The 404 is intentional, to prevent any leak of possibly sensitive information.
      const expectedErrorMessage = /not found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the Correlation, if no Correlation for the given ProcessInstanceId exists', async () => {
    const invalidProcessInstanceId = 'invalid_id';

    try {
      const correlationList = await testFixtureProvider
        .managementApiClient
        .getProcessInstanceById(defaultIdentity, invalidProcessInstanceId);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /No correlations.*?found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the Correlation, if the user is unauthorized', async () => {
    try {
      const correlationList = await testFixtureProvider
        .managementApiClient
        .getProcessInstanceById({}, processInstanceId);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  function assertProcessInstance(processInstance) {
    should(processInstance.correlationId).be.equal(correlationId);
    should(processInstance.processModelId).be.equal(processModelId);
    should(processInstance.processInstanceId).be.equal(processInstanceId);
    should(processInstance).have.property('processDefinitionName');
    should(processInstance).have.property('hash');
    should(processInstance).have.property('xml');
    should(processInstance).have.property('state');
    should(processInstance).have.property('identity');
    should(processInstance.identity).be.eql(defaultIdentity)
    should(processInstance).have.property('createdAt');
  }
});
