'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Management API:   Receive Process Terminated Notification', () => {

  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'test_consumer_api_process_terminate';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    const processModelsToImport = [
      processModelId,
    ];

    await testFixtureProvider.importProcessFiles(processModelsToImport);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a process is terminated', async () => {

    return new Promise((resolve, reject) => {

      const startEventId = 'StartEvent_1';
      const endEventId = 'EndEvent_1';
      const payload = {
        correlationId: uuid.v4(),
        inputValues: {},
      };
      const startCallbackType = StartCallbackType.CallbackOnProcessInstanceCreated;

      const messageReceivedCallback = (processTerminatedMessage) => {

        // Since this notification channel will receive ALL processTerminatedMessage messages,
        // we need to make sure that we intercepted the one we anticipated.
        if (processTerminatedMessage.correlationId !== payload.correlationId) {
          return;
        }

        should(processTerminatedMessage).not.be.undefined();
        should(processTerminatedMessage).have.property('correlationId');
        should(processTerminatedMessage.correlationId).be.equal(payload.correlationId);
        should(processTerminatedMessage).have.property('flowNodeId');
        should(processTerminatedMessage.flowNodeId).be.equal(endEventId);

        resolve();
      };

      testFixtureProvider.managementApiClientService.onProcessTerminated(defaultIdentity, messageReceivedCallback);

      testFixtureProvider
        .managementApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);
    });
  });

});
