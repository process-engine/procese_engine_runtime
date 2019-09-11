'use strict';

const moment = require('moment');
const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Start Events - ', () => {

  let autoStartService;
  let eventAggregator;
  let testFixtureProvider;
  let processInstanceHandler;

  const processModelId = 'start_event_tests';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    autoStartService = await testFixtureProvider.resolveAsync('AutoStartService');
    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    await autoStartService.start();
  });

  after(async () => {
    await autoStartService.stop();
    await testFixtureProvider.tearDown();
  });

  it('should start the process automatically, after a message was received.', async () => {

    const correlationId = uuid.v4();
    const identityToUse = testFixtureProvider.identities.defaultUser;

    return new Promise((resolve) => {
      const evaluationCallback = (message) => {

        const endEventToWaitFor = 'EndEvent_MessageTest';
        if (message.flowNodeId === endEventToWaitFor) {

          const expectedResult = /message received/i;
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          should(message.correlationId).be.equal(correlationId);
          should(message.processInstanceOwner).be.eql(identityToUse);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, evaluationCallback);

      const messageName = 'MessageAutoStart_Test';
      const samplePayload = {
        messageReference: messageName,
        processInstanceOwner: identityToUse,
        correlationId: correlationId,
        currentToken: 'sampleToken',
      };

      // Now publish the message and let the process run its course.
      eventAggregator.publish('message_triggered', samplePayload);
    });
  });

  it('should be able to start a process with a message start event manually.', async () => {

    const messageStartEventId = 'MessageStartEvent_1';

    const result = await testFixtureProvider.executeProcess(processModelId, messageStartEventId);

    const expectedResult = /message received/;
    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('should start the process automatically, after a signal was received', async () => {

    const correlationId = uuid.v4();
    const identityToUse = testFixtureProvider.identities.defaultUser;

    return new Promise((resolve) => {
      const evaluationCallback = (message) => {

        const endEventToWaitFor = 'EndEvent_SignalTest';
        if (message.flowNodeId === endEventToWaitFor) {

          const expectedResult = /signal received/i;
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          should(message.correlationId).be.equal(correlationId);
          should(message.processInstanceOwner).be.eql(identityToUse);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, evaluationCallback);

      const signalName = 'SignalAutoStart_Test';
      const samplePayload = {
        signalReference: signalName,
        processInstanceOwner: identityToUse,
        correlationId: correlationId,
        currentToken: 'sampleToken',
      };

      // Now publish the signal and let the process run its course.
      eventAggregator.publish('signal_triggered', samplePayload);
    });
  });

  it('should be able to start a process with a signal start event manually.', async () => {

    const signalStartEventId = 'SignalStartEvent_1';

    const result = await testFixtureProvider.executeProcess(processModelId, signalStartEventId);

    const expectedResult = /signal received/;
    should(result).have.property('currentToken');
    should(result.currentToken).be.match(expectedResult);
  });

  it('Should start the process after a delay of two seconds.', async () => {

    const timerStartEventId = 'TimerStartEvent_1';

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

    // NOTE: For some reason, the SQLite Adapter remains busy for some time after this test is done.
    // Until we know why, using a timeout here will help us avoid fatal disposal errors, which, apparently,
    // cannot be intercepted with try/catch.
    // This behavior has only been observed with SQLite; Postgres and Mysql do not appear to be affected.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
});
