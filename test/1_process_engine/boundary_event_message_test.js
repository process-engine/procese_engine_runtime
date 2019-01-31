'use strict';

const uuid = require('node-uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Message Boundary Event - ', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  const processModelId = 'boundary_event_message_test';
  const startEventId = 'StartEvent_1';
  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
    await testFixtureProvider.importProcessFiles([processModelId]);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should interrupt the UserTask when a message arrives', async () => {

    const expectedResult = /message received/i;

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    await new Promise((resolve) => {

      const onProcessFinishedCallback = (message) => {
        should(message.currentToken).be.match(expectedResult);
        resolve();
      };

      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, onProcessFinishedCallback);

      const triggerMessageEventName = '/processengine/process/message/Message1234';
      eventAggregator.publish(triggerMessageEventName, {});
    });
  });
});
