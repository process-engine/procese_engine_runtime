'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/process_instance/:process_instance_id', () => {

  let testFixtureProvider;
  let processInstanceId1;
  let processInstanceId2;

  const processModelId = 'test_consumer_api_correlation_result';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceId1 = await createFinishedProcessInstance(testFixtureProvider.identities.defaultUser);
    processInstanceId2 = await createFinishedProcessInstance(testFixtureProvider.identities.secondDefaultUser);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstance(identity) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(identity, processModelId, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.processInstanceId;
  }

  it('should return a correlation by its ProcessInstanceId through the Management API', async () => {

    const correlation = await testFixtureProvider
      .managementApiClientService
      .getCorrelationByProcessInstanceId(testFixtureProvider.identities.defaultUser, processInstanceId1);

    should(correlation).have.property('id');
    should(correlation).have.property('state');
    should(correlation).have.property('createdAt');
    should(correlation).have.property('identity');
    should(correlation.identity).have.property('token');
    should(correlation).have.property('processModels');

    correlation.processModels.forEach((processModel) => {
      should(processModel).have.property('processDefinitionName');
      should(processModel).have.property('processModelId');
      should(processModel.processModelId).be.equal(processModelId);
      should(processModel).have.property('processInstanceId');
      should(processModel).have.property('hash');
      should(processModel).have.property('xml');
      should(processModel).have.property('state');
      should(processModel).have.property('createdAt');
    });
  });

  it('should fail to retrieve the Correlation, if no Correlation for the given ProcessInstanceId exists', async () => {
    const invalidProcessInstanceId = 'invalid_id';

    try {
      const correlationList = await testFixtureProvider
        .managementApiClientService
        .getCorrelationByProcessInstanceId(testFixtureProvider.identities.defaultUser, invalidProcessInstanceId);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 404;
      const expectedErrorMessage = /No correlations.*?found/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail to retrieve the Correlation, if the user is unauthorized', async () => {
    try {
      const correlationList = await testFixtureProvider
        .managementApiClientService
        .getCorrelationByProcessInstanceId({}, processInstanceId1);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should only return correlations by ProcessInstanceId for a specific user', async () => {
    const correlationDefaultUser = await testFixtureProvider
      .managementApiClientService
      .getCorrelationByProcessInstanceId(testFixtureProvider.identities.defaultUser, processInstanceId1);

    should(correlationDefaultUser.identity.userId).be.equal(testFixtureProvider.identities.defaultUser.userId);

    const correlationSecondUser = await testFixtureProvider
      .managementApiClientService
      .getCorrelationByProcessInstanceId(testFixtureProvider.identities.secondDefaultUser, processInstanceId2);

    should(correlationSecondUser.identity.userId).be.equal(testFixtureProvider.identities.secondDefaultUser.userId);
  });
});
