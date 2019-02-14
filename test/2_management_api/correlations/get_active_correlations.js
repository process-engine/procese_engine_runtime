'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   GET  ->  /correlations/active', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId1;
  let correlationId2;
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

    correlationId1 = await createActiveCorrelations(defaultIdentity);
    correlationId2 = await createActiveCorrelations(secondDefaultIdentity);
  });

  after(async () => {
    await cleanup(correlationId1, defaultIdentity);
    await cleanup(correlationId2, secondDefaultIdentity);
    await testFixtureProvider.tearDown();
  });

  it('should return all active correlations for a user through the management api', async () => {

    const correlations = await testFixtureProvider
      .managementApiClientService
      .getActiveCorrelations(defaultIdentity);

    should(correlations).be.instanceOf(Array);
    should(correlations.length).be.greaterThan(0);

    correlations.forEach((correlation) => {
      should(correlation).have.property('id');
      should(correlation).have.property('state');
      should(correlation.state).be.equal('running');
      should(correlation).have.property('identity');
      should(correlation.identity).have.property('token');
      should(correlation).have.property('createdAt');
      should(correlation).have.property('processModels');

      correlation.processModels.forEach((processModel) => {
        should(processModel).have.property('processDefinitionName');
        should(processModel).have.property('processModelId');
        should(processModel).have.property('processInstanceId');
        should(processModel).have.property('hash');
        should(processModel).have.property('xml');
        should(processModel).have.property('state');
        should(processModel.state).be.equal('running');
        should(processModel).have.property('createdAt');
      });
    });
  });

  it('should fail to retrieve a list of correlations, when the user is unauthorized', async () => {
    try {
      const correlationList = await testFixtureProvider
        .managementApiClientService
        .getActiveCorrelations({});

      should.fail(correlationList, undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should only return active correlations of a specific user', async () => {
    const correlationListDefaultUser = await testFixtureProvider
      .managementApiClientService
      .getActiveCorrelations(defaultIdentity);

    correlationListDefaultUser.forEach((correlation) => {
      should(correlation.identity.userId).be.equal(defaultIdentity.userId);
    });

    const correlationListSecondUser = await testFixtureProvider
      .managementApiClientService
      .getActiveCorrelations(secondDefaultIdentity);

    correlationListSecondUser.forEach((correlation) => {
      should(correlation.identity.userId).be.equal(secondDefaultIdentity.userId);
    });
  });

  async function createActiveCorrelations(identity) {
    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, undefined, {}, identity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    return correlationId;
  }

  async function cleanup(correlationId, identity) {

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, resolve);

      const userTaskList = await testFixtureProvider
        .managementApiClientService
        .getUserTasksForProcessModelInCorrelation(identity, processModelId, correlationId);

      const userTaskInput = {
        formFields: {
          Sample_Form_Field: 'Hello',
        },
      };

      for (const userTask of userTaskList.userTasks) {
        await testFixtureProvider
          .managementApiClientService
          .finishUserTask(identity, userTask.processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskInput);
      }
    });
  }

});
