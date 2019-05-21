'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/all', () => {

  let testFixtureProvider;

  const processModelId = 'test_consumer_api_correlation_result';
  const errorProcessModelId = 'test_management_api_correlation_error';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId, errorProcessModelId]);

    await createFinishedProcessInstance(testFixtureProvider.identities.defaultUser, processModelId);
    await createFinishedProcessInstance(testFixtureProvider.identities.secondDefaultUser, processModelId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstance(identity, processModelIdToUse) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(identity, processModelIdToUse, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

  it('should return all correlations for an user through the management api', async () => {

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getAllCorrelations(testFixtureProvider.identities.defaultUser);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('processInstances');

      correlation.processInstances.forEach((processInstance) => {
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processModelId');
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
      .managementApiClientService
      .getAllCorrelations(testFixtureProvider.identities.superAdmin);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('processInstances');

      correlation.processInstances.forEach((processInstance) => {
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processModelId');
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
      .managementApiClientService
      .getAllCorrelations(testFixtureProvider.identities.defaultUser);

    correlationListDefaultUser.forEach((correlation) => {
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.defaultUser.userId);
      });
    });

    const correlationListSecondUser = await testFixtureProvider
      .managementApiClientService
      .getAllCorrelations(testFixtureProvider.identities.secondDefaultUser);

    correlationListSecondUser.forEach((correlation) => {
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.secondDefaultUser.userId);
      });
    });
  });

  it('should include correlations that were finished with an error', async () => {
    try {
      await createFinishedProcessInstance(testFixtureProvider.identities.defaultUser, errorProcessModelId);

      should.fail('The expected Error was not thrown');
    } catch (error) {
      /**
      * Give the persistance backend some time to persist the Correlation
      * results.
      */
      await wait(500);
    }

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getAllCorrelations(testFixtureProvider.identities.defaultUser);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    const oneCorrelationErrorState = correlations.some((currentCorrelation) => {
      return currentCorrelation.state === 'error';
    });

    should(oneCorrelationErrorState).be.true('No Correlation with an error state was found.');

  });

  it('should fail to retrieve a list of correlations, when the user is unauthorized', async () => {
    try {
      const correlationList = await testFixtureProvider
        .managementApiClientService
        .getAllCorrelations({});

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  async function wait(timeInMs) {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }
});
