'use strict';

const should = require('should');
const uuid = require('uuid');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe('EndEvents - ', () => {

  let testFixtureProvider;

  const processModelEndEventId = 'end_event_tests';
  const processModelTerminateEndEventId = 'terminate_end_event_sample';

  let eventAggregator;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    await testFixtureProvider.importProcessFiles([processModelEndEventId, processModelTerminateEndEventId]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a message when reaching a MessageEndEvent.', async () => {

    const startEventId = 'StartEvent_MessageTest';
    const correlationId = uuid.v4();

    return new Promise((resolve) => {

      const messageName = 'Message_Test';
      const endMessageToWaitFor = `/processengine/process/message/${messageName}`;

      const evaluationCallback = (message) => {
        const expectedResult = /message sent/i;

        should(message).have.property('currentToken');
        should(message.currentToken).be.match(expectedResult);
        resolve();
      };

      // Subscribe for the Message
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      testFixtureProvider.executeProcess(processModelEndEventId, startEventId, correlationId);
    });
  });

  it('should successfully finish a ProcessInstance, after sending a message through a MessageEndEvent.', async () => {

    const startEventId = 'StartEvent_MessageTest';
    const correlationId = uuid.v4();

    const result = await testFixtureProvider.executeProcess(processModelEndEventId, startEventId, correlationId);

    const expectedResult = /message sent/i;

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('should send a signal when reaching a SignalEndEvent', async () => {

    const startEventId = 'StartEvent_SignalTest';
    const correlationId = uuid.v4();

    return new Promise((resolve) => {

      const signalName = 'Signal_Test';
      const endMessageToWaitFor = `/processengine/process/signal/${signalName}`;

      const evaluationCallback = (message) => {
        const expectedResult = /signal sent/i;

        should(message).have.property('currentToken');
        should(message.currentToken).be.match(expectedResult);
        resolve();
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      testFixtureProvider.executeProcess(processModelEndEventId, startEventId, correlationId);
    });
  });

  it('should successfully finish a ProcessInstance, after sending a signal through a SignalEndEvent.', async () => {

    const startEventId = 'StartEvent_SignalTest';
    const correlationId = uuid.v4();

    const result = await testFixtureProvider.executeProcess(processModelEndEventId, startEventId, correlationId);

    const expectedResult = /signal sent/i;

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  // TODO:
  // This is broken, because of the way we currently deal with ParallelGateways.
  // Right now it is always assumed that each branch will ultimately lead back to a Join-Gateway,
  // which is obviously not the case when dealing with a TerminateEndEvent.
  // Also it is currently impossible for the ParallelGatewayHandler to deal with nested Gateways,
  // either Exclusive- or Parallel- Gateways, so there is no way to work around this.
  // In fact, it is dumb luck that this test hasn't broken down before now.
  it.skip('should successfully terminate a process upon reaching a TerminateEndEvent.', async () => {

    const startEventId = 'StartEvent_1';
    const correlationId = uuid.v4();

    try {
      await testFixtureProvider.executeProcess(processModelTerminateEndEventId, startEventId, correlationId);
      should.fail('error', undefined, 'This should have failed due to a TerminateEndEvent!');
    } catch (error) {
      const expectedError = /process was terminated.*?TerminateEndEvent_1/i;

      // TODO: This only shows the Blackbox Result of the test. To verify that the process- and all corresponding nodes
      // were actually terminated, we need to query the database.
      should(error.message).be.match(expectedError);
    }
  });
});
