'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/management_api_contracts').ProcessModelExecution.StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

describe('Management API:   Receive Process Started Notification', () => {

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

    return new Promise((resolve, reject) => {

      const correlationId = uuid.v4();
      let notificationReceived = false;

      const startEventId = 'StartEvent_1';
      const payload = {
        correlationId: correlationId,
        inputValues: {},
      };
      const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

      const notificationReceivedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        // Since this notification channel will receive ALL processStarted messages,
        // we need to make sure that we intercepted the one we anticipated.
        const messageWasNotFromSpecifiedCorrelation = processStartedMessage.correlationId !== payload.correlationId;
        if (messageWasNotFromSpecifiedCorrelation) {
          return;
        }

        should(processStartedMessage.correlationId).be.equal(payload.correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(startEventId);
        notificationReceived = true;
      };

      testFixtureProvider.managementApiClientService.onProcessStarted(defaultIdentity, notificationReceivedCallback);

      // We must await the end of the ProcessInstance to avoid messed up entries in the database.
      const processFinishedCallback = () => {
        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the started ProcessInstance!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);

      testFixtureProvider
        .managementApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);
    });
  });

  it('should send a notification when a process with a given ProcessModelId was started', async () => {

    return new Promise((resolve, reject) => {

      const correlationId = uuid.v4();
      let notificationReceived = false;

      const startEventId = 'StartEvent_1';
      const payload = {
        correlationId: correlationId,
        inputValues: {},
      };

      const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

      const notificationReceivedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        const messageWasNotFromSpecifiedCorrelation = processStartedMessage.correlationId !== payload.correlationId;
        if (messageWasNotFromSpecifiedCorrelation) {
          return;
        }

        should(processStartedMessage.correlationId).be.equal(payload.correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(startEventId);
        notificationReceived = true;
      };

      testFixtureProvider
        .managementApiClientService
        .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId);

      // We must await the end of the ProcessInstance to avoid messed up entries in the database.
      const processFinishedCallback = () => {
        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the started ProcessInstance!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);

      testFixtureProvider
        .managementApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);
    });
  });
});
