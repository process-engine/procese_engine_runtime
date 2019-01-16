'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Management API:   GET  ->  /process_model/:process_model_id/logs', () => {

  let testFixtureProvider;

  const correlationId = uuid.v4();
  const processModelId = 'test_consumer_api_correlation_result';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    await createFinishedProcessInstance();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstance() {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: correlationId,
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(testFixtureProvider.identities.defaultUser, processModelId, startEventId, payload, returnOn);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

  it('should successfully return the logs for a ProcessModel by its processModelId through the ManagementApi.', async () => {

    const logs = await testFixtureProvider
      .managementApiClientService
      .getProcessModelLog(testFixtureProvider.identities.defaultUser, processModelId);

    should(logs).be.an.Array();
    should(logs.length).be.greaterThan(0);

    for (const log of logs) {
      should(log).have.property('timeStamp');
      should(log).have.property('correlationId');
      should(log).have.property('processModelId');
      should(log).have.property('processInstanceId');
      should(log).have.property('logLevel');
      should(log).have.property('message');
    }
  });

  it('should successfully return logs for a ProcessModel that match a specific Correlation, if correlationId is provided.', async () => {

    const logs = await testFixtureProvider
      .managementApiClientService
      .getProcessModelLog(testFixtureProvider.identities.defaultUser, processModelId, correlationId);

    should(logs).be.an.Array();
    should(logs.length).be.greaterThan(0);

    for (const log of logs) {
      should(log).have.property('timeStamp');
      should(log).have.property('correlationId');
      should(log).have.property('processModelId');
      should(log).have.property('processInstanceId');
      should(log).have.property('logLevel');
      should(log).have.property('message');
      should(log.correlationId).be.equal(correlationId);
    }
  });

  it('should successfully return an empty Array, if no logs for the given ProcessModel were recorded.', async () => {

    const invalidProcessModelId = 'invalidProcessModelId';

    const logs = await testFixtureProvider
      .managementApiClientService
      .getProcessModelLog(testFixtureProvider.identities.defaultUser, invalidProcessModelId);

    should(logs).be.an.Array();
    should(logs).be.empty();
  });

  it('should fail to retrieve the logs, when the user is unauthorized.', async () => {

    try {
      const logs = await testFixtureProvider
        .managementApiClientService
        .getProcessModelLog({}, processModelId);

      should.fail(processModelId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
