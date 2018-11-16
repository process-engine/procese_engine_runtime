'use strict';

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

// NOTE: All main functionality is located in the Consumer API.
// Therefore, we just need to ensure that communication with the API is working correctly.
describe('Management API: Trigger Messages and Signals', () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let eventAggregator;

  let defaultIdentity;

  const processModelIdMessageEvent = 'test_management_api_message_event';
  const processModelIdSignalEvent = 'test_management_api_signal_event';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelIdMessageEvent, processModelIdSignalEvent]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully trigger the given signal event.', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdSignalEvent);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const signalEventName = 'test_signal_event';
    const payload = {};

    // To ensure that all works as expected, we must intercept the EndEvent notification that gets send by the Process instance.
    // Otherwise, there is no way to know for sure that the process has actually received the event we triggered.
    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelIdSignalEvent}/ended`;
      const evaluationCallback = (message) => {
        resolve();
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      testFixtureProvider
        .managementApiClientService
        .triggerSignalEvent(defaultIdentity, signalEventName, payload);
    });
  });

  it('should successfully trigger the given message event.', async () => {

    const correlationId = await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelIdMessageEvent);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId);

    const messageEventName = 'test_message_event';
    const payload = {};

    // To ensure that all works as expected, we must intercept the EndEvent notification that gets send by the Process instance.
    // Otherwise, there is no way to know for sure that the process has actually received the event we triggered.
    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelIdMessageEvent}/ended`;
      const evaluationCallback = (message) => {
        resolve();
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      testFixtureProvider
        .managementApiClientService
        .triggerMessageEvent(defaultIdentity, messageEventName, payload);
    });

  });

});
