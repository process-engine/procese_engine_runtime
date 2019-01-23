'use strict';

const should = require('should');
const uuid = require('uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs');

describe('Consumer API:   Receive Process Started Notification', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_process_start';

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

  it('should send a notification when the ProcessInstance was started', async () => {

    return new Promise(async (resolve, reject) => {

      const correlationId = uuid.v4();
      let notificationReceived = false;

      const notificationReceivedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        // Since this notification channel will receive ALL processStarted messages,
        // we need to make sure that we intercepted the one we anticipated.
        const messageWasNotFromSpecifiedCorrelation = processStartedMessage.correlationId !== correlationId;
        if (messageWasNotFromSpecifiedCorrelation) {
          return;
        }

        const expectedStartEventId = 'StartEvent_1';

        should(processStartedMessage.correlationId).be.equal(correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(expectedStartEventId);
        notificationReceived = true;
      };

      const notificationSubscription = await testFixtureProvider
        .consumerApiClientService
        .onProcessStarted(defaultIdentity, notificationReceivedCallback);

      // We must await the end of the ProcessInstance to avoid messed up entries in the database.
      const processFinishedCallback = async () => {
        await testFixtureProvider
          .consumerApiClientService
          .removeSubscription(defaultIdentity, notificationSubscription);

        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the started ProcessInstance!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification when a process with a given ProcessModelId was started', async () => {

    return new Promise(async (resolve, reject) => {

      const correlationId = uuid.v4();
      let notificationReceived = false;

      const notificationReceivedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        const messageWasNotFromSpecifiedCorrelation = processStartedMessage.correlationId !== correlationId;
        if (messageWasNotFromSpecifiedCorrelation) {
          return;
        }

        const expectedStartEventId = 'StartEvent_1';

        should(processStartedMessage.correlationId).be.equal(correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(expectedStartEventId);
        notificationReceived = true;
      };

      const notificationSubscription = await testFixtureProvider
        .consumerApiClientService
        .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId);

      // We must await the end of the ProcessInstance to avoid messed up entries in the database.
      const processFinishedCallback = async () => {
        await testFixtureProvider
          .consumerApiClientService
          .removeSubscription(defaultIdentity, notificationSubscription);

        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the started ProcessInstance!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });
});
