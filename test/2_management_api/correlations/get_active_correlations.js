'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   GET  ->  /correlations/active', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let secondDefaultIdentity;
  const processModelId = 'user_task_test';

  let processInstance1Data;
  let processInstance2Data;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondDefaultIdentity = testFixtureProvider.identities.secondDefaultUser;

    processInstance1Data = await createActiveCorrelations(defaultIdentity);
    processInstance2Data = await createActiveCorrelations(secondDefaultIdentity);
  });

  after(async () => {
    await cleanup(processInstance1Data, defaultIdentity);
    await cleanup(processInstance2Data, secondDefaultIdentity);
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
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(defaultIdentity.userId);
      });
    });

    const correlationListSecondUser = await testFixtureProvider
      .managementApiClientService
      .getActiveCorrelations(secondDefaultIdentity);

    correlationListSecondUser.forEach((correlation) => {
      correlation.processInstances.forEach((processInstance) => {
        should(processInstance.identity.userId).be.equal(testFixtureProvider.identities.secondDefaultUser.userId);
      });
    });
  });

  async function createActiveCorrelations(identity) {
    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelId, undefined, {}, identity);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId, processModelId);

    return result;
  }

  async function cleanup(processInstanceData, identity) {

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(processInstanceData.processInstanceId, resolve);

      const userTaskList = await testFixtureProvider
        .managementApiClientService
        .getUserTasksForProcessModelInCorrelation(identity, processModelId, processInstanceData.correlationId);

      const userTaskInput = {
        formFields: {
          Sample_Form_Field: 'Hello',
        },
      };

      for (const userTask of userTaskList.userTasks) {
        await testFixtureProvider
          .managementApiClientService
          .finishUserTask(identity, userTask.processInstanceId, userTask.correlationId, userTask.flowNodeInstanceId, userTaskInput);
      }
    });
  }

});
