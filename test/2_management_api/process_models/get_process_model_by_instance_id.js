'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('ManagementAPI:   GET  -> /process_instance/:process_instance_id/process_model/', () => {

  let testFixtureProvider;
  let processInstanceHandler;

  const processModelId = 'test_consumer_api_correlation_result';
  let processInstanceId;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await createFinishedProcessInstance();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return a ProcessModel by its ProcessInstanceId through the ManagementAPI, if the user has all required LaneClaims', async () => {

    const processModel = await testFixtureProvider
      .managementApiClient
      .getProcessModelByProcessInstanceId(testFixtureProvider.identities.defaultUser, processInstanceId);

    should(processModel).have.property('id');
    should(processModel).have.property('xml');
    should(processModel).have.property('startEvents');
    should(processModel).have.property('endEvents');
    should(processModel.startEvents.length).be.greaterThan(0);
    should(processModel.endEvents.length).be.greaterThan(0);
  });

  it('should return a ProcessModel by its ProcessInstanceId through the ManagementAPI, if the user is a SuperAdmin', async () => {

    const processModel = await testFixtureProvider
      .managementApiClient
      .getProcessModelByProcessInstanceId(testFixtureProvider.identities.superAdmin, processInstanceId);

    should(processModel).have.property('id');
    should(processModel).have.property('xml');
    should(processModel).have.property('startEvents');
    should(processModel).have.property('endEvents');
    should(processModel.startEvents.length).be.greaterThan(0);
    should(processModel.endEvents.length).be.greaterThan(0);
  });

  it('should fail to retrieve the ProcessModel, when the ProcessInstance does not exist', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClient
        .getProcessModelByProcessInstanceId(testFixtureProvider.identities.defaultUser, 'SomeInvalidProcessInstanceId');

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /No.*?ProcessInstance.*?found./i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the ProcessModel, when the user is unauthorized', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClient
        .getProcessModelByProcessInstanceId({}, processInstanceId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the ProcessModel, if the User does not have the required LaneClaims', async () => {

    try {
      const processModel = await testFixtureProvider
        .managementApiClient
        .getProcessModelByProcessInstanceId(testFixtureProvider.identities.restrictedUser, processInstanceId);

      should.fail(processModel, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /access denied/i;
      const expectedErrorCode = 403;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  async function createFinishedProcessInstance() {
    return new Promise(async (resolve, reject) => {
      const correlationId = uuid.v4();
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, resolve);

      const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, correlationId);
      processInstanceId = result.processInstanceId;
    });
  }
});
