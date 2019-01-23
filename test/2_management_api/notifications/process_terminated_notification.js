'use strict';

const should = require('should');
const uuid = require('uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs');

describe('Management API:   Receive Process Terminated Notification', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const correlationId = uuid.v4();
  const processModelId = 'test_consumer_api_process_terminate';

  const noopCallback = () => {};

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a process is terminated', async () => {

    return new Promise(async (resolve, reject) => {

      const messageReceivedCallback = (processTerminatedMessage) => {
        const expectedEndEventId = 'EndEvent_1';

        should(processTerminatedMessage).not.be.undefined();
        should(processTerminatedMessage).have.property('correlationId');
        should(processTerminatedMessage.correlationId).be.equal(correlationId);
        should(processTerminatedMessage).have.property('flowNodeId');
        should(processTerminatedMessage.flowNodeId).be.equal(expectedEndEventId);

        resolve();
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClientService
        .onProcessTerminated(defaultIdentity, messageReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should fail to subscribe for the ProcessTerminated notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onProcessTerminated({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

});
