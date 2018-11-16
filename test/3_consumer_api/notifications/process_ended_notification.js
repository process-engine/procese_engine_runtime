'use strict';

const should = require('should');
const uuid = require('uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').StartCallbackType;

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;

describe('Consumer API:   Receive Process Ended Notification', () => {

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

  it('should send a notification when a process is finished', async () => {

    return new Promise((resolve, reject) => {

      const startEventId = 'StartEvent_1';
      const endEventId = 'EndEvent_Success';
      const payload = {
        correlationId: uuid.v4(),
        inputValues: {},
      };
      const startCallbackType = StartCallbackType.CallbackOnEndEventReached;

      const onProcessEndCallback = (processEndedMessage) => {

        if (processEndedMessage.correlationId !== payload.correlationId) {
          return;
        }

        should.exist(processEndedMessage);
        should(processEndedMessage).have.property('correlationId');
        should(processEndedMessage.correlationId).be.equal(payload.correlationId);
        should(processEndedMessage).have.property('flowNodeId');
        should(processEndedMessage.flowNodeId).be.equal(endEventId);

        resolve();
      };

      testFixtureProvider.consumerApiClientService.onProcessEnded(defaultIdentity, onProcessEndCallback);

      testFixtureProvider
        .consumerApiClientService
        .startProcessInstance(defaultIdentity, processModelId, startEventId, payload, startCallbackType, endEventId);

    });
  });

});
