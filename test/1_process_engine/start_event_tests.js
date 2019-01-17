'use strict';

const moment = require('moment');
const should = require('should');
const uuid = require('uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

describe('Start Events - ', () => {

  let eventAggregator;
  let testFixtureProvider;
  let processInstanceHandler;

  const processModelId = 'start_event_tests';

  const messageStartEventId = 'MessageStartEvent_1';
  const signalStartEventId = 'SignalStartEvent_1';
  const timerStartEventId = 'TimerStartEvent_1';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
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
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    return new Promise((resolve) => {
      const evaluationCallback = (message) => {
        if (message.flowNodeId === endEventToWaitFor) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, evaluationCallback);

      const samplePayload = {
        currentToken: 'sampleToken',
      };

      // Now publish the message and let the process run its course.
      const messageName = 'Message_Test';
      eventAggregator.publish(`/processengine/process/message/${messageName}`, samplePayload);
    });
  });

  it('should only start the process, after a signal was received', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_SignalTest';

    const expectedResult = /signal received/i;

    // We can't await the process execution here, because that would prevent us from sending the signal.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelId, signalStartEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    return new Promise((resolve) => {
      const evaluationCallback = (message) => {
        if (message.flowNodeId === endEventToWaitFor) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, evaluationCallback);

      const samplePayload = {
        currentToken: 'sampleToken',
      };

      // Now publish the signal and let the process run its course.
      const signalName = 'Signal_Test';
      eventAggregator.publish(`/processengine/process/signal/${signalName}`, samplePayload);
    });
  });

  it('Should start the process after a delay of two seconds.', async () => {

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
    const expectedTimerRuntime = 2;

    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
    should(duration).be.greaterThan(expectedTimerRuntime);
  });

  async function wait(miliseconds) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, miliseconds);
    });
  }

});
