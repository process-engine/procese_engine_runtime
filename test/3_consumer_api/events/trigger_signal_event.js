'use strict';

const should = require('should');

const TestFixtureProvider = require('../../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../../dist/commonjs').ProcessInstanceHandler;

describe('Consumer API: POST  ->  /signals/:signal_name/trigger', () => {

  let processInstanceHandler;
  let testFixtureProvider;
  let eventAggregator;

  let defaultIdentity;

  const processModelIdSignalEvent = 'test_consumer_api_signal_event';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    await testFixtureProvider.importProcessFiles([processModelIdSignalEvent]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should fail trigger the event, when the user is unauthorized', async () => {

    const signalEventName = 'test_signal_event';
    const payload = {};

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerSignalEvent({}, signalEventName, payload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 401;
      const expectedErrorMessage = /no auth token provided/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should fail trigger the event, when the user forbidden to retrieve it', async () => {

    const signalEventName = 'test_signal_event';
    const payload = {};

    const restrictedIdentity = testFixtureProvider.identities.restrictedUser;

    try {
      await testFixtureProvider
        .consumerApiClientService
        .triggerSignalEvent(restrictedIdentity, signalEventName, payload);

      should.fail('unexpectedSuccesResult', undefined, 'This request should have failed!');
    } catch (error) {
      const expectedErrorCode = 403;
      const expectedErrorMessage = /access denied/i;
      should(error.code).be.match(expectedErrorCode);
      should(error.message).be.match(expectedErrorMessage);
    }
  });

  it('should successfully trigger the given signal event, even if no process is currently listening for it.', async () => {

    const signalEventName = 'test_signal_event';
    const payload = {};

    await testFixtureProvider
      .consumerApiClientService
      .triggerSignalEvent(defaultIdentity, signalEventName, payload);
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
        .consumerApiClientService
        .triggerSignalEvent(defaultIdentity, signalEventName, payload);
    });
  });

});
