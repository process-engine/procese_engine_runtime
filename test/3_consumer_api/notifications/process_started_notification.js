'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Consumer API:   Receive Process Started Notification', () => {

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
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a process was started', async () => {

    return new Promise((resolve, reject) => {

      const startEventId = 'StartEvent_1';
      const payload = {
        correlationId: uuid.v4(),
        inputValues: {},
      };
      const startCallbackType = StartCallbackType.CallbackOnProcessInstanceFinished;

      const onProcessStartedCallback = (processStartedEvent) => {
        should.exist(processStartedEvent);
        should(processStartedEvent).have.property('correlationId');

        if (processStartedEvent.correlationId !== payload.correlationId) {
          return;
        }

        should(processStartedEvent.correlationId).be.equal(payload.correlationId);
        should(processStartedEvent).have.property('flowNodeId');
        should(processStartedEvent.flowNodeId).be.equal(startEventId);

        resolve();
      };

      testFixtureProvider.consumerApiClientService.onProcessStarted(defaultIdentity, onProcessStartedCallback);

      testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);
    });
  });

  it('should send a notification when a process with a given ProcessModelId was started', async () => {
    return new Promise((resolve, reject) => {

      const startEventId = 'StartEvent_1';
      const payload = {
        correlationId: uuid.v4(),
        inputValues: {},
      };
      const startCallbackType = StartCallbackType.CallbackOnProcessInstanceFinished;

      const onProcessStartedCallback = (processStartedEvent) => {
        should.exist(processStartedEvent);
        should(processStartedEvent).have.property('correlationId');

        if (processStartedEvent.correlationId !== payload.correlationId) {
          return;
        }

        should(processStartedEvent.correlationId).be.equal(payload.correlationId);
        should(processStartedEvent).have.property('flowNodeId');
        should(processStartedEvent.flowNodeId).be.equal(startEventId);

        resolve();
      };

      testFixtureProvider.consumerApiClientService.onProcessWithProcessModelIdStarted(defaultIdentity, onProcessStartedCallback, processModelId);

      testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType);
    });
  });
});
