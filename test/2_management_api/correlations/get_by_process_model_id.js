'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/process_model/:process_model_id', () => {

  let testFixtureProvider;

  const processModelId = 'test_consumer_api_correlation_result';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    await createFinishedProcessInstanceWithIdentity(testFixtureProvider.identities.defaultUser);
    await createFinishedProcessInstanceWithIdentity(testFixtureProvider.identities.secondDefaultUser);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstanceWithIdentity(identity) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(identity, processModelId, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

  it('should return a correlation by its id for a user through the Management API', async () => {

    const correlations = await testFixtureProvider
      .managementApiClient
      .getCorrelationsByProcessModelId(testFixtureProvider.identities.defaultUser, processModelId);

    should(correlations).be.an.Array();
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {

      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('processInstances');

      correlation.processInstances.forEach((processInstance) => {
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processModelId');
        should(processInstance.processModelId).be.equal(processModelId);
        should(processInstance).have.property('processInstanceId');
        should(processInstance).have.property('hash');
        should(processInstance).have.property('xml');
        should(processInstance).have.property('state');
        should(processInstance).have.property('identity');
        should(processInstance.identity).have.property('token');
        should(processInstance).have.property('createdAt');
      });
    });
  });

  it('should return all correlations for a super admin through the management api', async () => {

    const correlations = await testFixtureProvider
      .managementApiClient
      .getCorrelationsByProcessModelId(testFixtureProvider.identities.defaultUser, processModelId);

    should(correlations).be.an.Array();
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {

      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('processInstances');

      correlation.processInstances.forEach((processInstance) => {
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processModelId');
        should(processInstance.processModelId).be.equal(processModelId);
        should(processInstance).have.property('processInstanceId');
        should(processInstance).have.property('hash');
        should(processInstance).have.property('xml');
        should(processInstance).have.property('state');
        should(processInstance).have.property('identity');
        should(processInstance.identity).have.property('token');
        should(processInstance).have.property('createdAt');
      });
    });
  });

  it('should filter out another user\'s Correlations, if the requesting user is a regular user', async () => {
    const correlationListDefaultUser = await testFixtureProvider
      .managementApiClient
      .getCorrelationsByProcessModelId(testFixtureProvider.identities.defaultUser, processModelId);

    correlationListDefaultUser.forEach((correlation) => {
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.defaultUser.userId);
      });
    });

    const correlationListSecondUser = await testFixtureProvider
      .managementApiClient
      .getCorrelationsByProcessModelId(testFixtureProvider.identities.secondDefaultUser, processModelId);

    correlationListSecondUser.forEach((correlation) => {
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.secondDefaultUser.userId);
      });
    });
  });

  it('should fail to retrieve the Correlations, if no Correlation for the given ProcessModel exists', async () => {
    const invalidProcessModelId = 'invalid_id';

    try {
      const correlationList = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(testFixtureProvider.identities.defaultUser, invalidProcessModelId);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /No correlations.*?found/i;
      const expectedErrorCode = 404;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to retrieve the Correlations, if the user is unauthorized', async () => {
    try {
      const correlationList = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId({}, processModelId);

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorMessage = /no auth token provided/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

});
