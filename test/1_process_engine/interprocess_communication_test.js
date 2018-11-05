'use strict';

const should = require('should');
const uuid = require('uuid');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('Inter-process communication - ', () => {

  let testFixtureProvider;

  const processModelSendEvents = 'end_event_tests';
  const processModelReceiveEvents = 'start_event_tests';

  let eventAggregator;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelSendEvents, processModelReceiveEvents]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should only start process B, after process A finished with a message.', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_MessageTest';

    const expectedResult = /message received/i;

    // We can't await the process execution here, because that would prevent us from starting the second process.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelReceiveEvents, 'MessageStartEvent_1', correlationId);

    await wait(500);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelReceiveEvents}/ended`;
      const evaluationCallback = (message) => {
        if (message.flowNodeId === endEventToWaitFor) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the message.
      testFixtureProvider.executeProcess(processModelSendEvents, 'StartEvent_MessageTest', correlationId);
    });
  });

  it('should only start process B, after process A finished with a signal', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_SignalTest';

    const expectedResult = /signal received/i;

    // We can't await the process execution here, because that would prevent us from starting the second process.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelReceiveEvents, 'SignalStartEvent_1', correlationId);

    await wait(500);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelReceiveEvents}/ended`;
      const evaluationCallback = (message) => {
        if (message.flowNodeId === endEventToWaitFor) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the signal.
      testFixtureProvider.executeProcess(processModelSendEvents, 'StartEvent_SignalTest', correlationId);
    });
  });

  async function wait(miliseconds) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, miliseconds);
    });
  }

});
