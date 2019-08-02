'use strict';

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

// NOTE: All main functionality is located in the Consumer API.
// Therefore, we just need to ensure that communication with the API is working correctly.
describe('Management API: Trigger Messages and Signals', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelIdMessageEvent = 'test_management_api_message_event';
  const processModelIdSignalEvent = 'test_management_api_signal_event';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelIdMessageEvent, processModelIdSignalEvent]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should successfully trigger the given signal event.', async () => {

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdSignalEvent);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId);

    const signalEventName = 'test_signal_event';
    const payload = {};

    // To ensure that all works as expected, we must intercept the EndEvent notification that gets send by the Process instance.
    // Otherwise, there is no way to know for sure that the process has actually received the event we triggered.
    return new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      testFixtureProvider
        .managementApiClient
        .triggerSignalEvent(defaultIdentity, signalEventName, payload);
    });
  });

  it('should successfully trigger the given message event.', async () => {

    const result = await processInstanceHandler.startProcessInstanceAndReturnResult(processModelIdMessageEvent);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(result.correlationId);

    const messageEventName = 'test_message_event';
    const payload = {};

    // To ensure that all works as expected, we must intercept the EndEvent notification that gets send by the Process instance.
    // Otherwise, there is no way to know for sure that the process has actually received the event we triggered.
    return new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(result.processInstanceId, resolve);

      testFixtureProvider
        .managementApiClient
        .triggerMessageEvent(defaultIdentity, messageEventName, payload);
    });

  });

});
