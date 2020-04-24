'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('ManagementAPI: GetAllCorrelations', () => {

  let testFixtureProvider;
  let defaultIdentity;
  let secondIdentity;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondIdentity = testFixtureProvider.identities.secondDefaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const processModelId = 'test_management_api_generic_sample';
    const errorProcessModelId = 'test_management_api_correlation_error';

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId, errorProcessModelId]);
      await createFinishedProcessInstance(defaultIdentity, processModelId);
      await createFinishedProcessInstance(secondIdentity, processModelId);
    });

    after(async () => {
      // The correlations must be removed, so they won't interfere with the pagination tests.
      await testFixtureProvider.clearDatabases();
    });

    it('should return all correlations for an user through the management api', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations.length).be.greaterThan(0);

      correlationList.correlations.forEach((correlation) => {
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

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(testFixtureProvider.identities.superAdmin);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations.length).be.greaterThan(0);

      correlationList.correlations.forEach((correlation) => {
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
        .managementApiClient
        .getAllCorrelations(defaultIdentity);

      correlationListDefaultUser.correlations.forEach((correlation) => {
        correlation.processInstances.forEach((processInstance) => {
          should(processInstance.identity.userId).be.equal(defaultIdentity.userId);
        });
      });

      const correlationListSecondUser = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(secondIdentity);

      correlationListSecondUser.correlations.forEach((correlation) => {
        correlation.processInstances.forEach((processInstance) => {
          should(processInstance.identity.userId).be.equal(secondIdentity.userId);
        });
      });
    });

    it('should include correlations that were finished with an error', async () => {
      try {
        await createFinishedProcessInstance(defaultIdentity, errorProcessModelId);

        should.fail('The expected Error was not thrown');
      } catch (error) {
        // Give the backend some time to persist the results.
        await wait(500);
      }

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations.length).be.greaterThan(0);

      const oneCorrelationErrorState = correlationList.correlations.some((currentCorrelation) => {
        return currentCorrelation.state === 'error';
      });

      should(oneCorrelationErrorState).be.true('No Correlation with an error state was found.');
    });
  });

  describe('Pagination', () => {

    const processModelId = 'test_management_api_generic_sample';

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      // This will create 10 sample correlations.
      for (let i = 0; i < 10; i++) {
        await createFinishedProcessInstance(defaultIdentity, processModelId);
      }
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity, 5);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity, 0, 2);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity, 5, 2);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity, 7, 5);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity, 0, 20);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getAllCorrelations(defaultIdentity, 1000);

      should(correlationList.correlations).be.an.Array();
      should(correlationList.correlations).be.empty();
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a list of correlations, when the user is unauthorized', async () => {
      try {
        const correlationList = await testFixtureProvider
          .managementApiClient
          .getAllCorrelations({});

        should.fail(correlationList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });

  async function createFinishedProcessInstance(identity, processModelIdToUse) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: uuid.v4(),
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(identity, processModelIdToUse, payload, returnOn, startEventId);

    should(result).have.property('correlationId');
    should(result.correlationId).be.equal(payload.correlationId);

    return result.correlationId;
  }

  async function wait(timeInMs) {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }
});
