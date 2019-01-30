'use strict';

const uuid = require('node-uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Signal Boundary Event - ', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  const processModelId = 'boundary_event_signal_test';
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

  it('should interrupt the UserTask when a signal arrives', async () => {

    const expectedResult = /signal received/i;

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    await new Promise((resolve) => {

      const onProcessFinishedCallback = (signal) => {
        should(signal.currentToken).be.match(expectedResult);
        resolve();
      };

      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, onProcessFinishedCallback);

      const triggerSignalEventName = '/processengine/process/signal/Signal1234';
      eventAggregator.publish(triggerSignalEventName, {});
    });
  });
});
