'use strict';

const uuid = require('uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

describe('BoundaryEvent Chaining Tests - ', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  const processModelId = 'boundary_event_chaining_test';
  const startEventId = 'StartEvent_1';
  const correlationId = uuid.v4();

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

  it('Should cancel all BoundaryEvents, after the ManualTask was finished.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    await finishManualTask(manualTask);
    const results = await triggerEventsInSequence(manualTask, finishManualTask);

    should(results.messageReceived).be.equal(false, 'The MessageBoundaryEvent was triggered after the ManualTask was finished!');
    should(results.signalReceived).be.equal(false, 'The SignalBoundaryEvent was triggered after the ManualTask was finished!');
    should(results.timeoutExpired).be.equal(false, 'The TimerBoundaryEvent was triggered after the ManualTask was finished!');
  });

  it('Should interrupt the ManualTask and all other BoundaryEvents, after a MessageBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    const samplePayload = {
      currentToken: 'sampleToken',
    };

    const messageName = '/processengine/process/message/TestMessage1234';
    const results = await triggerEventsInSequence(manualTask, messageName, samplePayload);

    should(results.messageReceived).be.equal(true, 'The expected Message was not received!');
    should(results.signalReceived).be.equal(false, 'The SignalBoundaryEvent was triggered after interruption');
    should(results.timeoutExpired).be.equal(false, 'The TimerBoundaryEvent did not abort as expected!');
    should(results.manualTaskWasFinished).be.equal(false, 'The ManualTask was still able to finish after interruption!');
  });

  it('Should interrupt the ManualTask and all other BoundaryEvents, after a SignalBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    const samplePayload = {
      currentToken: 'sampleToken',
    };

    const signalName = '/processengine/process/signal/TestSignal1234';
    const results = await triggerEventsInSequence(manualTask, signalName, samplePayload);

    should(results.signalReceived).be.equal(true, 'The expected Signal was not received!');
    should(results.messageReceived).be.equal(false, 'The MessageBoundaryEvent was triggered after interruption');
    should(results.timeoutExpired).be.equal(false, 'The TimerBoundaryEvent did not abort as expected!');
    should(results.manualTaskWasFinished).be.equal(false, 'The ManualTask was still able to finish after interruption!');
  });

  it('Should interrupt the ManualTask and all other BoundaryEvents, after the TimerBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    const results = await triggerEventsInSequence(manualTask, 'timeout');

    should(results.timeoutExpired).be.equal(true, 'The TimerBoundaryEvent was not triggered in time!');
    should(results.signalReceived).be.equal(false, 'The SignalBoundaryEvent was triggered after interruption');
    should(results.messageReceived).be.equal(false, 'The MessageBoundaryEvent was triggered after interruption!');
    should(results.manualTaskWasFinished).be.equal(false, 'The ManualTask was still able to finish after interruption!');
  });

  async function getWaitingManualTask() {

    const waitingManualTasks =
      await processInstanceHandler.getWaitingManualTasksForCorrelationId(testFixtureProvider.identities.defaultIdentity, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.greaterThan(0);

    const manualTask = waitingManualTasks.manualTasks[0];

    return manualTask;
  }

  async function finishManualTask(manualTask) {
    return new Promise((resolve) => {

      // eslint-disable-next-line
      const finishedManualTaskMsg = `/processengine/correlation/${correlationId}/processinstance/${manualTask.processInstanceId}/manualtask/${manualTask.flowNodeInstanceId}/finished`;
      const subscription = eventAggregator.subscribeOnce(finishedManualTaskMsg, (message) => {
        if (subscription) {
          subscription.dispose();
        }
        resolve();
      });
      // eslint-disable-next-line
      const finishManualTaskMsg = `/processengine/correlation/${correlationId}/processinstance/${manualTask.processInstanceId}/manualtask/${manualTask.flowNodeInstanceId}/finish`;
      eventAggregator.publish(finishManualTaskMsg, {});
    });
  }

  async function triggerEventsInSequence(manualTask, eventToTriggerFirst, eventPayload) {

    return new Promise(async (resolve) => {

      let manualTaskWasFinished = false;
      let messageReceived = false;
      let signalReceived = false;
      let timeoutExpired = false;

      // Subscribe to each event that will notify us about a triggered BoundaryEvent, or the finished ManualTask.
      const manualTaskConfirmationMessage = '/processengine/process/message/AcknowledgeManualTaskFinished';
      const manualTaskSubscription = eventAggregator.subscribeOnce(manualTaskConfirmationMessage, () => {
        console.log('MANUAL TASK FINISHED');
        manualTaskWasFinished = true;
      });

      const messageConfirmationMessage = '/processengine/process/message/AcknowledgeMessageReceived';
      const messageReceivedSubscription = eventAggregator.subscribeOnce(messageConfirmationMessage, () => {
        console.log('MESSAGE RECEIVED');
        messageReceived = true;
      });

      const signalConfirmationMessage = '/processengine/process/message/AcknowledgeSignalReceived';
      const signalReceivedSubscription = eventAggregator.subscribeOnce(signalConfirmationMessage, () => {
        console.log('SIGNAL RECEIVED');
        signalReceived = true;
      });

      const timeoutConfirmationMessage = '/processengine/process/message/AcknowledgeTimoutExpired';
      const timeoutExpiredSubscription = eventAggregator.subscribeOnce(timeoutConfirmationMessage, () => {
        console.log('TIMER EXPIRED');
        timeoutExpired = true;
      });

      if (eventToTriggerFirst === 'timeout') {
        await new Promise((cb) => {
          setTimeout(cb, 3000);
        });
      } else if (eventToTriggerFirst !== undefined) {
        eventAggregator.publish(eventToTriggerFirst, eventPayload || {});
        await new Promise((cb) => {
          setTimeout(cb, 500);
        });
      }

      // eslint-disable-next-line
      const finishManualTaskEventName = `/processengine/correlation/${correlationId}/processinstance/${manualTask.processInstanceId}/manualtask/${manualTask.flowNodeInstanceId}/finish`;
      const triggerMessageEventName = '/processengine/process/message/TestMessage1234';
      const triggerSignalEventName = '/processengine/process/signal/TestSignal1234';

      // Now trigger each event and the ManualTask.
      eventAggregator.publish(finishManualTaskEventName, {});
      eventAggregator.publish(triggerMessageEventName, {});
      eventAggregator.publish(triggerSignalEventName, {});

      // This leaves enough time for the TimerBoundaryEvent to be triggered.
      if (eventToTriggerFirst !== 'timeout') {
        await new Promise((cb) => {
          setTimeout(cb, 3000);
        });
      }

      if (manualTaskSubscription) {
        manualTaskSubscription.dispose();
      }

      if (messageReceivedSubscription) {
        manualTaskSubscription.dispose();
      }

      if (signalReceivedSubscription) {
        manualTaskSubscription.dispose();
      }

      if (timeoutExpiredSubscription) {
        manualTaskSubscription.dispose();
      }

      // TODO - BUG: For some reason, calling dispose on the subscriptions does not remove them from the EventAggregator.
      // This means that they will keep getting called, until the EventAggregator is disposed after the tests.
      // To avoid false positives, the subscriptions get cleared here manually.
      //
      // The Subscriptions created by the BoundaryEvents seem to dispose correctly, though.
      delete eventAggregator.eventLookup[manualTaskConfirmationMessage];
      delete eventAggregator.eventLookup[messageConfirmationMessage];
      delete eventAggregator.eventLookup[signalConfirmationMessage];
      delete eventAggregator.eventLookup[timeoutConfirmationMessage];
      delete eventAggregator.eventLookup[`/processengine/correlation/${correlationId}/processmodel/${processModelId}/ended`];

      return resolve({
        manualTaskWasFinished: manualTaskWasFinished,
        messageReceived: messageReceived,
        signalReceived: signalReceived,
        timeoutExpired: timeoutExpired,
      });
    });
  }
});
