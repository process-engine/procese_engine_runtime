'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').DataModels.ProcessModels.StartCallbackType;
const CorrelationState = require('@process-engine/management_api_contracts').DataModels.Correlations.CorrelationState;

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API: GetProcessInstancesByState', () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;
  let secondIdentity;
  let superAdmin;

  const processModelId = 'test_management_api_generic_sample';
  const processModelId2 = 'test_management_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondIdentity = testFixtureProvider.identities.secondDefaultUser;
    superAdmin = testFixtureProvider.identities.superAdmin;

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId, processModelId2]);
      await createSuspendedProcessInstance(defaultIdentity, correlationId);
      await createFinishedProcessInstance(defaultIdentity, correlationId);
      await createFinishedProcessInstance(secondIdentity, correlationId);
    });

    after(async () => {
      // The ProcessInstances must be removed, so they won't interfere with the pagination tests.
      await testFixtureProvider.clearDatabases();
    });

    it('should return all ProcessInstances with a matching state for the default user', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(defaultIdentity, CorrelationState.finished);

        should(processInstanceList.processInstances).be.an.Array();
        should(processInstanceList.processInstances).have.a.lengthOf(1);

      processInstanceList.processInstances.forEach((processInstance) => {
        should(processInstance.correlationId).be.equal(correlationId);
        should(processInstance.processModelId).be.equal(processModelId);
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processInstanceId');
        should(processInstance).have.property('hash');
        should(processInstance).have.property('xml');
        should(processInstance).have.property('state');
        should(processInstance).have.property('identity');
        should(processInstance.identity).be.eql(defaultIdentity);
        should(processInstance).have.property('createdAt');
      });
    });

    it('should return all ProcessInstances with a matching state for all users, if the request is made by a superAdmin', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(superAdmin, CorrelationState.finished);

        should(processInstanceList.processInstances).be.an.Array();
        should(processInstanceList.processInstances).have.a.lengthOf(2);

      processInstanceList.processInstances.forEach((processInstance) => {
        should(processInstance.correlationId).be.equal(correlationId);
        should(processInstance.processModelId).be.equal(processModelId);
        should(processInstance).have.property('processDefinitionName');
        should(processInstance).have.property('processInstanceId');
        should(processInstance).have.property('hash');
        should(processInstance).have.property('xml');
        should(processInstance).have.property('state');
        should(processInstance).have.property('identity');
        should(processInstance).have.property('createdAt');
      });
    });

    it('should throw a NotFound error, if no ProcessInstances with the given state exist', async () => {

      try {
        const processInstanceList = await testFixtureProvider
          .managementApiClient
          .getProcessInstancesByState(superAdmin, CorrelationState.error);

          should.fail(processInstanceList, undefined, 'This request should have failed!');
        } catch (error) {
          console.log(error);
          const expectedErrorMessage = /no.*?found/i;
          const expectedErrorCode = 404;
          should(error.message).be.match(expectedErrorMessage);
          should(error.code).be.equal(expectedErrorCode);
      }
    });
  });

  describe('Pagination', () => {

    const correlationId = uuid.v4();

    before(async () => {
      await testFixtureProvider.importProcessFiles([processModelId]);
      // This will create 10 sample ProcessInstances.
      for (let i = 0; i < 10; i++) {
        await createFinishedProcessInstance(defaultIdentity, correlationId);
      }

      // There is a gap between the last "createFinished" command and the last correlation's state transition to "finished".
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(defaultIdentity, CorrelationState.finished, 5);

      should(processInstanceList.processInstances).be.an.instanceOf(Array);
      should(processInstanceList.processInstances).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(defaultIdentity, CorrelationState.finished, 0, 2);

      should(processInstanceList.processInstances).be.an.instanceOf(Array);
      should(processInstanceList.processInstances).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(defaultIdentity, CorrelationState.finished, 5, 2);

      should(processInstanceList.processInstances).be.an.instanceOf(Array);
      should(processInstanceList.processInstances).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(defaultIdentity, CorrelationState.finished, 7, 5);

      should(processInstanceList.processInstances).be.an.instanceOf(Array);
      should(processInstanceList.processInstances).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(defaultIdentity, CorrelationState.finished, 0, 20);

      should(processInstanceList.processInstances).be.an.instanceOf(Array);
      should(processInstanceList.processInstances).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const processInstanceList = await testFixtureProvider
        .managementApiClient
        .getProcessInstancesByState(defaultIdentity, CorrelationState.finished, 1000);

      should(processInstanceList.processInstances).be.an.instanceOf(Array);
      should(processInstanceList.processInstances).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve the ProcessInstances, if the user is unauthorized', async () => {
      try {
        const processInstanceList = await testFixtureProvider
          .managementApiClient
          .getProcessInstancesByState({}, CorrelationState.finished);

        should.fail(processInstanceList, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorMessage = /no auth token provided/i;
        const expectedErrorCode = 401;
        should(error.message).be.match(expectedErrorMessage);
        should(error.code).be.equal(expectedErrorCode);
      }
    });
  });

  async function createSuspendedProcessInstance(identity, correlationId) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: correlationId,
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceCreated;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(identity, processModelId2, payload, returnOn, startEventId);

    should(result.correlationId).be.equal(payload.correlationId, 'The ProcessInstance does not use the provided CorrelationId!');

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId2);
  }

  async function createFinishedProcessInstance(identity, correlationId) {

    const startEventId = 'StartEvent_1';
    const payload = {
      correlationId: correlationId,
      inputValues: {},
    };

    const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

    const result = await testFixtureProvider
      .managementApiClient
      .startProcessInstance(identity, processModelId, payload, returnOn, startEventId);

    should(result.correlationId).be.equal(payload.correlationId, 'The ProcessInstance does not use the provided CorrelationId!');

    return result.correlationId;
  }

});
