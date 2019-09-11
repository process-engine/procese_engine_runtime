'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   GET  ->  /correlations/active', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let secondDefaultIdentity;
  const processModelId = 'user_task_test';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondDefaultIdentity = testFixtureProvider.identities.secondDefaultUser;

    await createActiveCorrelations(defaultIdentity);
    await createActiveCorrelations(secondDefaultIdentity);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should return all active correlations for a user through the management api', async () => {

    const correlations = await testFixtureProvider
      .managementApiClient
      .getActiveCorrelations(defaultIdentity);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
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

    const correlations = await testFixtureProvider
      .managementApiClient
      .getActiveCorrelations(testFixtureProvider.identities.superAdmin);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
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

    correlationListDefaultUser.forEach((correlation) => {
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(defaultIdentity.userId);
      });
    });

    const correlationListSecondUser = await testFixtureProvider
      .managementApiClient
      .getActiveCorrelations(secondDefaultIdentity);

    correlationListSecondUser.forEach((correlation) => {
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.secondDefaultUser.userId);
      });
    });
  });

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

  async function createActiveCorrelations(identity) {
    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, undefined, {}, identity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelId);

    return result;
  }

});
