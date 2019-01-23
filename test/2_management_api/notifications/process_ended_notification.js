'use strict';

const should = require('should');
const uuid = require('uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs');

describe('Management API:   Receive Process Ended Notification', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const correlationId = uuid.v4();
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

  it('should send a notification when a process is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationSubscription;

      const onProcessEndCallback = async (processEndedMessage) => {

        if (processEndedMessage.correlationId !== correlationId) {
          return;
        }

        const expectedEndEventId = 'EndEvent_Success';

        should.exist(processEndedMessage);
        should(processEndedMessage).have.property('correlationId');
        should(processEndedMessage.correlationId).be.equal(correlationId);
        should(processEndedMessage).have.property('flowNodeId');
        should(processEndedMessage.flowNodeId).be.equal(expectedEndEventId);

        await testFixtureProvider
          .managementApiClientService
          .removeSubscription(defaultIdentity, notificationSubscription);

        resolve();
      };

      notificationSubscription = await testFixtureProvider
        .managementApiClientService
        .onProcessEnded(defaultIdentity, onProcessEndCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

});
