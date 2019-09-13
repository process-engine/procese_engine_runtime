'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs/test_setup').TestFixtureProvider;

describe('Management API: GetCorrelationsByProcessModelId', () => {

  let testFixtureProvider;
  let defaultIdentity;
  let secondIdentity;

  const processModelId = 'test_management_api_generic_sample';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondIdentity = testFixtureProvider.identities.secondDefaultUser
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      await createFinishedProcessInstance(defaultIdentity);
      await createFinishedProcessInstance(secondIdentity);
    });

    after(async () => {
      // The correlations must be removed, so they won't interfere with the pagination tests.
      await testFixtureProvider.clearDatabases();
    });

    it('should return a correlation by its id for a user through the Management API', async () => {

      const correlations = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId);

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
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId);

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
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId);

      correlationListDefaultUser.forEach((correlation) => {
        correlation.processInstances.forEach((processInstance) => {
          should(processInstance.identity.userId).be.equal(defaultIdentity.userId);
        });
      });

      const correlationListSecondUser = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(secondIdentity, processModelId);

      correlationListSecondUser.forEach((correlation) => {
        correlation.processInstances.forEach((processInstance) => {
          should(processInstance.identity.userId).be.equal(secondIdentity.userId);
        });
      });
    });

    it('should fail to retrieve the Correlations, if no Correlation for the given ProcessModel exists', async () => {
      const invalidProcessModelId = 'invalid_id';

      try {
        const correlationList = await testFixtureProvider
          .managementApiClient
          .getCorrelationsByProcessModelId(defaultIdentity, invalidProcessModelId);

        should.fail(correlationList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /No correlations.*?found/i;
        const expectedErrorCode = 404;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
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

      const correlations = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId, 5);

      should(correlations).be.an.instanceOf(Array);
      should(correlations).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const correlations = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId, 0, 2);

      should(correlations).be.an.instanceOf(Array);
      should(correlations).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const correlations = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId, 5, 2);

      should(correlations).be.an.instanceOf(Array);
      should(correlations).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const correlations = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId, 7, 5);

      should(correlations).be.an.instanceOf(Array);
      should(correlations).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const correlations = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId, 0, 20);

      should(correlations).be.an.instanceOf(Array);
      should(correlations).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const correlations = await testFixtureProvider
        .managementApiClient
        .getCorrelationsByProcessModelId(defaultIdentity, processModelId, 1000);

      should(correlations).be.an.instanceOf(Array);
      should(correlations).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

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

  async function createFinishedProcessInstance(identity) {

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

});
