'use strict';

const uuid = require('node-uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs');

describe('ManualTask BoundaryEvent Chaining Tests - ', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'manual_task_chained_boundary_events_test';
  const startEventId = 'StartEvent_1';
  const correlationId = uuid.v4();

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([processModelId]);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
    defaultIdentity = testFixtureProvider.identities.defaultUser;
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('Should cancel all BoundaryEvents, after the ManualTask was finished.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    await finishManualTask(manualTask);

    await new Promise(async (resolve) => {
      // Wait for the confirmation message that the ManualTask was finished.
      // At that point, the BoundaryEvents should not be active any more.
      eventAggregator.subscribeOnce('/processengine/process/message/AcknowledgeManualTaskFinished', resolve);

      await finishManualTask(manualTask);
    });
    const results = await triggerEventsInSequence(manualTask);

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

  it('Should successfully abort the ManualTask after a MessageBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    should.exist(manualTask, 'ManualTask was not started!');

    // Finish the task and wait for the ProcessInstance to finish to get a clean database structure.
    await new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTask.processInstanceId, resolve);
      const triggerMessageEventName = '/processengine/process/message/TestMessage1234';
      eventAggregator.publish(triggerMessageEventName, {});
    });

    // Now see if the ManualTask is still listed as active.
    const waitingManualTasks = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.equal(0);
  });

  it('Should successfully abort the ManualTask after a SignalBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    should.exist(manualTask, 'ManualTask was not started!');

    // Finish the task and wait for the ProcessInstance to finish to get a clean database structure.
    await new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTask.processInstanceId, resolve);
      const triggerSignalEventName = '/processengine/process/signal/TestSignal1234';
      eventAggregator.publish(triggerSignalEventName, {});
    });

    // Now see if the ManualTask is still listed as active.
    const waitingManualTasks = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.equal(0);
  });

  it('Should successfully abort the ManualTask after a TimerBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const manualTask = await getWaitingManualTask();

    should.exist(manualTask, 'ManualTask was not started!');

    // Wait until the TimerBoundaryEvent gets triggered and finishes the ProcessInstance.
    await new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(manualTask.processInstanceId, resolve);
    });

    // Now see if the ManualTask is still listed as active.
    const waitingManualTasks = await testFixtureProvider
      .consumerApiClientService
      .getManualTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.equal(0);
  });

  async function getWaitingManualTask() {

    const waitingManualTasks =
      await processInstanceHandler.getWaitingManualTasksForCorrelationId(defaultIdentity, correlationId);

    should(waitingManualTasks.manualTasks).be.instanceOf(Array);
    should(waitingManualTasks.manualTasks.length).be.greaterThan(0);

    const manualTask = waitingManualTasks.manualTasks[0];

    return manualTask;
  }

  async function finishManualTask(manualTask) {
    return new Promise((resolve) => {
      // eslint-disable-next-line
      const finishedManualTaskMsg = `/processengine/correlation/${correlationId}/processinstance/${manualTask.processInstanceId}/manualtask/${manualTask.flowNodeInstanceId}/finished`;
      eventAggregator.subscribeOnce(finishedManualTaskMsg, resolve);
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
        manualTaskWasFinished = true;
      });

      const messageConfirmationMessage = '/processengine/process/message/AcknowledgeMessageReceived';
      const messageReceivedSubscription = eventAggregator.subscribeOnce(messageConfirmationMessage, () => {
        messageReceived = true;
      });

      const signalConfirmationMessage = '/processengine/process/message/AcknowledgeSignalReceived';
      const signalReceivedSubscription = eventAggregator.subscribeOnce(signalConfirmationMessage, () => {
        signalReceived = true;
      });

      const timeoutConfirmationMessage = '/processengine/process/message/AcknowledgeTimoutExpired';
      const timeoutExpiredSubscription = eventAggregator.subscribeOnce(timeoutConfirmationMessage, () => {
        timeoutExpired = true;
      });

      if (eventToTriggerFirst === 'timeout') {
        await new Promise((cb) => {
          eventAggregator.subscribeOnce(timeoutConfirmationMessage, cb);
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

      const finishWithTimerBoundaryEvent = eventToTriggerFirst !== 'timeout';
      if (finishWithTimerBoundaryEvent) {
        // Wait until the TimerBoundaryEvent is supposed to be triggered.
        // Don't wait for the notification itself, because it is not actually supposed to happen!
        await new Promise((cb) => {
          setTimeout(cb, 2000);
        });
      }

      // Clear all subscriptions that may still be active to avoid false positives for follow up tests.
      eventAggregator.unsubscribe(manualTaskSubscription);
      eventAggregator.unsubscribe(messageReceivedSubscription);
      eventAggregator.unsubscribe(signalReceivedSubscription);
      eventAggregator.unsubscribe(timeoutExpiredSubscription);

      return resolve({
        manualTaskWasFinished: manualTaskWasFinished,
        messageReceived: messageReceived,
        signalReceived: signalReceived,
        timeoutExpired: timeoutExpired,
      });
    });
  }
});
