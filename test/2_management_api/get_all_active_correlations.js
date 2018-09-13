'use strict';

const should = require('should');

const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Management API:   GET  ->  /correlations/active', () => {

  let testFixtureProvider;

  let correlationId;
  const processModelId = 'user_task_test';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    const result = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(testFixtureProvider.context.defaultUser, processModelId, 'StartEvent_1', {});

    correlationId = result.correlationId;

    await waitForProcessToReachFirstFlowNode();
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  // NOTE:
  // Technically, this test works just as expected.
  // However, some, as of yet undetermined, error causes this test to fail on Jenkins.
  // This is most likely a timing issue, since this seems to only happen, when Jenkins runs under enormous strain,
  // but it requires further investigation before any kind of fix can be tried.
  it('should return all active correlations through the management api', async () => {

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getAllActiveCorrelations(testFixtureProvider.context.defaultUser);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
      should(correlation).have.property('id');
      should(correlation).have.property('processModelId');
    });
  });

  it('should fail to retrieve a list of correlations, when the user is unauthorized', async () => {
    try {
      const processModelList = await testFixtureProvider
        .managementApiClientService
        .getAllActiveCorrelations({});

      should.fail(processModelList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  /**
   * Periodically checks if a given correlation exists. After a specific number of retries has been exceeded, an error is thrown.
   * This is to help avoid any timing errors that may occur because of the immediate resolving after starting the process instance.
   */
  async function waitForProcessToReachFirstFlowNode() {

    const maxNumberOfRetries = 10;
    const delayBetweenRetriesInMs = 500;

    const flowNodeInstanceService = await testFixtureProvider.resolveAsync('FlowNodeInstanceService');

    for (let i = 0; i < maxNumberOfRetries; i++) {

      await wait(delayBetweenRetriesInMs);

      const flowNodeInstances = await flowNodeInstanceService.queryByCorrelation(correlationId);

      if (flowNodeInstances && flowNodeInstances.length >= 1) {
        return;
      }
    }

    throw new Error(`No process instance within correlation '${correlationId}' found! The process instance like failed to start!`);
  }

  async function wait(timeInMs) {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }

});
