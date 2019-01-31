'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup/fixture_providers/test_fixture_provider').TestFixtureProvider;

describe.only('Management API:   GET  ->  /correlations/all', () => {

  let testFixtureProvider;

  const genericProcessModelId = 'test_consumer_api_correlation_result';
  const errorProcessModelId = 'test_management_api_correlation_error';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([genericProcessModelId, errorProcessModelId]);

    await createFinishedProcessInstance(genericProcessModelId);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  async function createFinishedProcessInstance(processModelIdToUse) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(testFixtureProvider.identities.defaultUser, processModelIdToUse, startEventId, payload, returnOn);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

  it('should include all correlations that were finished with an error', async () => {

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getAllCorrelations(testFixtureProvider.identities.defaultUser);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('identity');
      should(correlation.identity).have.property('token');
      should(correlation).have.property('processModels');

      correlation.processModels.forEach((processModel) => {
        should(processModel).have.property('processDefinitionName');
        should(processModel).have.property('processModelId');
        should(processModel).have.property('processInstanceId');
        should(processModel).have.property('hash');
        should(processModel).have.property('xml');
        should(processModel).have.property('state');
        should(processModel).have.property('createdAt');
      });
    });
  });

  it('should return all correlations and at least one which has the error state set', async () => {
    try {
      await createFinishedProcessInstance(errorProcessModelId);

      should.fail('The expected Error was not thrown');
    } catch (error) {
      /**
      * Give the persistance backend some time to persist the Correlation
      * results.
      */
      await new Promise((resolve) => setTimeout(resolve, 750));
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
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getAllCorrelations({});

      should.fail(processModelList, undefined, 'This request should have failed!');
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
