'use strict';

const moment = require('moment');
const should = require('should');
const uuid = require('uuid');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;

describe.only('Start Events - ', () => {

  let testFixtureProvider;

  const processModelId = 'start_event_tests';

  const messageStartEventId = 'MessageStartEvent_1';
  const signalStartEventId = 'SignalStartEvent_1';
  const timerStartEventId = 'TimerStartEvent_1';

  let eventAggregator;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should only start the process, after a message was received.', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_MessageTest';

    const expectedResult = /message received/i;

    // We can't await the process execution here, because that would prevent us from sending the signal.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelId, messageStartEventId, correlationId);

    await waitForProcessInstanceToReachSuspendedTask(correlationId);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`;
      const evaluationCallback = (message) => {
        if (message.flowNodeId === endEventToWaitFor) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Now publish the message and let the process run its course.
      const messageName = 'Message_Test';
      eventAggregator.publish(`/processengine/process/message/${messageName}`);
    });
  });

  it('should only start the process, after a signal was received', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_SignalTest';

    const expectedResult = /signal received/i;

    // We can't await the process execution here, because that would prevent us from sending the signal.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelId, signalStartEventId, correlationId);

    await waitForProcessInstanceToReachSuspendedTask(correlationId);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`;
      const evaluationCallback = (message) => {
        if (message.flowNodeId === endEventToWaitFor) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Now publish the signal and let the process run its course.
      const signalName = 'Signal_Test';
      eventAggregator.publish(`/processengine/process/signal/${signalName}`);
    });
  });

  it('Should start the process after a delay of five seconds.', async () => {

    const timeStampBeforeStart = moment();

    const result = await testFixtureProvider.executeProcess(processModelId, timerStartEventId);

    const timeStampAfterFinish = moment();

    // Note that this is not exact,
    // since this time span equals the total process execution time and not just the duration of the timer.
    // This means that we can't perform an exact match here. We can only see, if the process execution was
    // delayed by at least the amount of time that the timer was supposed to last.
    const runtimeRaw = timeStampAfterFinish.diff(timeStampBeforeStart);
    const duration = moment
      .duration(runtimeRaw)
      .asSeconds();

    const expectedResult = /success/i;
    const expectedTimerRuntime = 5;

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
    should(duration).be.greaterThan(expectedTimerRuntime);
  });

  async function waitForProcessInstanceToReachSuspendedTask(correlationId) {
    const maxNumberOfRetries = 10;
    const retryDelay = 500;

    const flowNodeInstanceService = await testFixtureProvider.resolveAsync('FlowNodeInstanceService');

    for (let currentTry = 0; currentTry < maxNumberOfRetries; currentTry += 1) {
      await wait(retryDelay);

      let flowNodeInstances = await flowNodeInstanceService.querySuspendedByCorrelation(correlationId);

      if (processModelId) {
        flowNodeInstances = flowNodeInstances.filter((fni) => {
          return fni.tokens[0].processModelId === processModelId;
        });
      }

      if (flowNodeInstances.length >= 1) {
        break;
      } else {
        throw new Error(`No process instance within correlation '${correlationId}' found! The process instance may failed to start!`);
      }
    }
  }

  async function wait(miliseconds) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, miliseconds);
    });
  }

});
