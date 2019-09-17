'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI:   GET  ->  /process_model/:process_model_id/logs', () => {

  let testFixtureProvider;

  const correlationId = uuid.v4();
  const processModelId = 'test_management_api_generic_sample';

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
      .managementApiClient
      .startProcessInstance(testFixtureProvider.identities.defaultUser, processModelId, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

  it('should successfully return the logs for a ProcessModel by its processModelId through the ManagementApi.', async () => {

    const logEntryList = await testFixtureProvider
      .managementApiClient
      .getProcessModelLog(testFixtureProvider.identities.defaultUser, processModelId);

    should(logEntryList.logEntries).be.an.Array();
    should(logEntryList.logEntries.length).be.greaterThan(0);

    for (const log of logEntryList.logEntries) {
      should(log).have.property('timeStamp');
      should(log).have.property('correlationId');
      should(log).have.property('processModelId');
      should(log).have.property('processInstanceId');
      should(log).have.property('logLevel');
      should(log).have.property('message');
    }
  });

  it('should successfully return logs for a ProcessModel that match a specific Correlation, if correlationId is provided.', async () => {

    const logEntryList = await testFixtureProvider
      .managementApiClient
      .getProcessModelLog(testFixtureProvider.identities.defaultUser, processModelId, correlationId);

    should(logEntryList.logEntries).be.an.Array();
    should(logEntryList.logEntries.length).be.greaterThan(0);

    for (const log of logEntryList.logEntries) {
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

    const logEntryList = await testFixtureProvider
      .managementApiClient
      .getProcessModelLog(testFixtureProvider.identities.defaultUser, invalidProcessModelId);

    should(logEntryList.logEntries).be.an.Array();
    should(logEntryList.logEntries).be.empty();
  });

  it('should fail to retrieve the logs, when the user is unauthorized.', async () => {

    try {
      const logEntryList = await testFixtureProvider
        .managementApiClient
        .getProcessModelLog({}, processModelId);

      should.fail(processModelId, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.equal(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

});
