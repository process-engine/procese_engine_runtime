'use strict';

const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   GET  ->  /correlations/active', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let correlationId_1;
  let correlationId_2;
  let defaultIdentity;
  let secondDefaultIdentity;
  const processModelId = 'user_task_test';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);
    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondDefaultIdentity = testFixtureProvider.identities.secondDefaultUser;

    const result1 = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(defaultIdentity, processModelId, 'StartEvent_1', {});

    const result2 = await testFixtureProvider
      .managementApiClientService
      .startProcessInstance(secondDefaultIdentity, processModelId, 'StartEvent_1', {});

    correlationId_1 = result1.correlationId;
    correlationId_2 = result2.correlationId;

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await waitForProcessToReachFirstFlowNode(correlationId_1);
    await waitForProcessToReachFirstFlowNode(correlationId_2);
  });

  after(async () => {
    await cleanup(correlationId_1, defaultIdentity);
    await cleanup(correlationId_2, secondDefaultIdentity);
    await testFixtureProvider.tearDown();
  });

  it('should return all active correlations for an user through the management api', async () => {

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
      should(correlation.identity.userId).equal(defaultIdentity.userId)
    });

    const correlationListSecondUser = await testFixtureProvider
      .managementApiClientService
      .getActiveCorrelations(secondDefaultIdentity);

    correlationListSecondUser.forEach((correlation) => {
      should(correlation.identity.userId).equal(secondDefaultIdentity.userId)
    });
  });

  /**
   * Periodically checks if a given correlation exists. After a specific number of retries has been exceeded, an error is thrown.
   * This is to help avoid any timing errors that may occur because of the immediate resolving after starting the process instance.
   */
  async function waitForProcessToReachFirstFlowNode(correlationId) {

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

  async function cleanup(correlationId, identity) {

    await new Promise(async (resolve, reject) => {
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, resolve);

      const userTaskList = await testFixtureProvider
        .consumerApiClientService
        .getUserTasksForProcessModelInCorrelation(identity, processModelId, correlationId);

      const userTaskInput = {
        formFields: {
          Sample_Form_Field: 'Hello',
        },
      };

      for (const userTask of userTaskList.userTasks) {
        await testFixtureProvider
          .consumerApiClientService
          .finishUserTask(identity, userTask.processInstanceId, correlationId, userTask.flowNodeInstanceId, userTaskInput);
      }
    });
  }

  async function wait(timeInMs) {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }

});
