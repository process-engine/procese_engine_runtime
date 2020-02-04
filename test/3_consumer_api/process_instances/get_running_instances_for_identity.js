'use strict';

const jsonwebtoken = require('jsonwebtoken');
const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('ConsumerAPI: GetProcessInstancesByIdentity', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;
  let secondaryIdentity;
  let restrictedIdentity;

  const processModelId = 'test_consumer_api_usertask';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    defaultIdentity = testFixtureProvider.identities.defaultUser;
    secondaryIdentity = testFixtureProvider.identities.superAdmin;
    restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  describe('Execution', () => {
    const correlationId = uuid.v4();

    before(async () => {
      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);
    });

    it('should return a Users ProcessInstances by his identity', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(defaultIdentity);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances.length).be.greaterThan(0);

      for (const processInstance of processInstances) {
        should(processInstance).have.property('id');
        should(processInstance).have.property('owner');
        should(processInstance.correlationId).be.equal(correlationId);
        should(processInstance.processModelId).be.equal(processModelId);

        const decodedRequestingIdentity = jsonwebtoken.decode(processInstance.owner.token);
        const decodedProcessInstanceIdentity = jsonwebtoken.decode(defaultIdentity.token);
        should(decodedRequestingIdentity.sub).be.equal(decodedProcessInstanceIdentity.sub);
      }
    });

    it('should filter out ProcessInstances that belong to a different User', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(secondaryIdentity);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(0);
    });

    it('should return an empty Array, if no accessible running ProcessInstances were found', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(restrictedIdentity);

      should(results).have.a.property('processInstances');

      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(0);
    });

  });

  describe('Pagination', () => {

    before(async () => {
      // Create a number of ProcessInstances so we can actually test the pagination.
      const correlationId = uuid.v4();
      for (let i = 0; i < 10; i++) {
        await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId, undefined, secondaryIdentity);
      }
      await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId, 10);
    });

    it('should apply no limit, an offset of 5 and return 5 items', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(secondaryIdentity, 5);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(5);
    });

    it('should apply no offset, a limit of 2 and return 2 items', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(secondaryIdentity, 0, 2);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(2);
    });

    it('should apply an offset of 5, a limit of 2 and return 2 items', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(secondaryIdentity, 5, 2);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(2);
    });

    it('should apply an offset of 7, a limit of 5 and return 3 items', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(secondaryIdentity, 7, 5);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(3);
    });

    it('should return all items, if the limit is larger than the max number of records', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(secondaryIdentity, 0, 20);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(10);

    });

    it('should return an empty Array, if the offset is out of bounds', async () => {

      const results = await testFixtureProvider
        .consumerApiClient
        .getProcessInstancesByIdentity(secondaryIdentity, 1000);

      should(results).have.a.property('processInstances');
      const processInstances = results.processInstances;

      should(processInstances).be.an.instanceOf(Array);
      should(processInstances).have.a.lengthOf(0);
    });
  });

  describe('Security Checks', () => {

    it('should fail to retrieve a Users ProcessInstances, when the user is unauthorized', async () => {

      try {
        const processInstances = await testFixtureProvider
          .consumerApiClient
          .getProcessInstancesByIdentity({});

        should.fail(processInstances, undefined, 'This request should have failed!');
      } catch (error) {
        const expectedErrorCode = 401;
        const expectedErrorMessage = /no auth token provided/i;
        should(error.code).be.match(expectedErrorCode);
        should(error.message).be.match(expectedErrorMessage);
      }
    });

  });
});
