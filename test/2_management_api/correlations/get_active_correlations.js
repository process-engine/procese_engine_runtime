'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetActiveCorrelations', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let secondDefaultIdentity;
  const processModelId = 'user_task_test';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondDefaultIdentity = testFixtureProvider.identities.secondDefaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      await createActiveCorrelations(defaultIdentity);
      await createActiveCorrelations(secondDefaultIdentity);
    });

    after(async () => {
      // The correlations must be removed, so they won't interfere with the pagination tests.
      await testFixtureProvider.clearDatabases();
    });

    it('should return all active correlations for a user through the management api', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations.length).be.greaterThan(0);

      correlationList.correlations.forEach((correlation) => {
        should(correlation).have.property('id');
        should(correlation).have.property('state');
        should(correlation.state).be.equal('running');
        should(correlation).have.property('createdAt');
        should(correlation).have.property('processInstances');

        correlation.processInstances.forEach((processInstance) => {
          should(processInstance).have.property('processDefinitionName');
          should(processInstance).have.property('processModelId');
          should(processInstance).have.property('processInstanceId');
          should(processInstance).have.property('hash');
          should(processInstance).have.property('xml');
          should(processInstance).have.property('state');
          should(processInstance.state).be.equal('running');
          should(processInstance).have.property('identity');
          should(processInstance.identity).have.property('token');
          should(processInstance).have.property('createdAt');
        });
      });
    });

    it('should return all active correlations for a super admin through the management api', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(testFixtureProvider.identities.superAdmin);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations.length).be.greaterThan(0);

      correlationList.correlations.forEach((correlation) => {
        should(correlation).have.property('id');
        should(correlation).have.property('state');
        should(correlation.state).be.equal('running');
        should(correlation).have.property('createdAt');
        should(correlation).have.property('processInstances');

        correlation.processInstances.forEach((processInstance) => {
          should(processInstance).have.property('processDefinitionName');
          should(processInstance).have.property('processModelId');
          should(processInstance).have.property('processInstanceId');
          should(processInstance).have.property('hash');
          should(processInstance).have.property('xml');
          should(processInstance).have.property('state');
          should(processInstance.state).be.equal('running');
          should(processInstance).have.property('identity');
          should(processInstance.identity).have.property('token');
          should(processInstance).have.property('createdAt');
        });
      });
    });

    it('should filter out another user\'s Correlations, if the requesting user is a regular user', async () => {
      const correlationListDefaultUser = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity);

      correlationListDefaultUser.correlations.forEach((correlation) => {
        correlation.processInstances.forEach((processInstance) => {
          should(processInstance.identity.userId).be.equal(defaultIdentity.userId);
        });
      });

      const correlationListSecondUser = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(secondDefaultIdentity);

      correlationListSecondUser.correlations.forEach((correlation) => {
        correlation.processInstances.forEach((processInstance) => {
          should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.secondDefaultUser.userId);
        });
      });
    });
  });

  describe('Pagination', () => {

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      // This will create 10 sample correlations.
      for (let i = 0; i < 10; i++) {
        await createActiveCorrelations(defaultIdentity);
      }
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity, 5);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity, 0, 2);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity, 5, 2);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity, 7, 5);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity, 0, 20);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const correlationList = await testFixtureProvider
        .managementApiClient
        .getActiveCorrelations(defaultIdentity, 1000);

      should(correlationList.correlations).be.an.instanceOf(Array);
      should(correlationList.correlations).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a list of correlations, when the user is unauthorized', async () => {
      try {
        const correlationList = await testFixtureProvider
          .managementApiClient
          .getActiveCorrelations({});

        should.fail(correlationList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });

  async function createActiveCorrelations(identity) {
    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, undefined, {}, identity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelId);

    return result;
  }

});
