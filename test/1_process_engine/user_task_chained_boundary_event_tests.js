'use strict';

const uuid = require('node-uuid');
const should = require('should');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('UserTask BoundaryEvent Chaining Tests - ', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;
  let defaultIdentity;

  const processModelId = 'user_task_chained_boundary_events_test';
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

  it('Should cancel all BoundaryEvents, after the UserTask was finished.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const userTask = await getWaitingUserTask();

    await new Promise(async (resolve) => {
      // Wait for the confirmation message that the UserTask was finished.
      // At that point, the BoundaryEvents should not be active any more.
      eventAggregator.subscribeOnce('/processengine/process/message/AcknowledgeUserTaskFinished', resolve);

      await finishUserTask(userTask);
    });
    const results = await triggerEventsInSequence(userTask);

    should(results.messageReceived).be.equal(false, 'The MessageBoundaryEvent was triggered after the UserTask was finished!');
    should(results.signalReceived).be.equal(false, 'The SignalBoundaryEvent was triggered after the UserTask was finished!');
    should(results.timeoutExpired).be.equal(false, 'The TimerBoundaryEvent was triggered after the UserTask was finished!');
  });

  it('Should interrupt the UserTask and all other BoundaryEvents, after a MessageBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const userTask = await getWaitingUserTask();

    const samplePayload = {
      currentToken: 'sampleToken',
    };

    const messageName = '/processengine/process/message/TestMessage1234';
    const results = await triggerEventsInSequence(userTask, messageName, samplePayload);

    should(results.messageReceived).be.equal(true, 'The expected Message was not received!');
    should(results.signalReceived).be.equal(false, 'The SignalBoundaryEvent was triggered after interruption');
    should(results.timeoutExpired).be.equal(false, 'The TimerBoundaryEvent did not abort as expected!');
    should(results.userTaskWasFinished).be.equal(false, 'The UserTask was still able to finish after interruption!');
  });

  it('Should interrupt the UserTask and all other BoundaryEvents, after a SignalBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const userTask = await getWaitingUserTask();

    const samplePayload = {
      currentToken: 'sampleToken',
    };

    const signalName = '/processengine/process/signal/TestSignal1234';
    const results = await triggerEventsInSequence(userTask, signalName, samplePayload);

    should(results.signalReceived).be.equal(true, 'The expected Signal was not received!');
    should(results.messageReceived).be.equal(false, 'The MessageBoundaryEvent was triggered after interruption');
    should(results.timeoutExpired).be.equal(false, 'The TimerBoundaryEvent did not abort as expected!');
    should(results.userTaskWasFinished).be.equal(false, 'The UserTask was still able to finish after interruption!');
  });

  it('Should interrupt the UserTask and all other BoundaryEvents, after the TimerBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const userTask = await getWaitingUserTask();

    const results = await triggerEventsInSequence(userTask, 'timeout');

    should(results.timeoutExpired).be.equal(true, 'The TimerBoundaryEvent was not triggered in time!');
    should(results.signalReceived).be.equal(false, 'The SignalBoundaryEvent was triggered after interruption');
    should(results.messageReceived).be.equal(false, 'The MessageBoundaryEvent was triggered after interruption!');
    should(results.userTaskWasFinished).be.equal(false, 'The UserTask was still able to finish after interruption!');
  });

  it('Should successfully abort the UserTask after a MessageBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const userTask = await getWaitingUserTask();

    should.exist(userTask, 'UserTask was not started!');

    // Finish the task and wait for the ProcessInstance to finish to get a clean database structure.
    await new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(userTask.processInstanceId, resolve);
      const triggerMessageEventName = '/processengine/process/message/TestMessage1234';
      eventAggregator.publish(triggerMessageEventName, {});
    });

    // Now see if the UserTask is still listed as active.
    const waitingUserTasks = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(waitingUserTasks.userTasks).be.instanceOf(Array);
    should(waitingUserTasks.userTasks.length).be.equal(0);
  });

  it('Should successfully abort the UserTask after a SignalBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const userTask = await getWaitingUserTask();

    should.exist(userTask, 'UserTask was not started!');

    // Finish the task and wait for the ProcessInstance to finish to get a clean database structure.
    await new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(userTask.processInstanceId, resolve);
      const triggerSignalEventName = '/processengine/process/signal/TestSignal1234';
      eventAggregator.publish(triggerSignalEventName, {});
    });

    // Now see if the UserTask is still listed as active.
    const waitingUserTasks = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(waitingUserTasks.userTasks).be.instanceOf(Array);
    should(waitingUserTasks.userTasks.length).be.equal(0);
  });

  it('Should successfully abort the UserTask after a TimerBoundaryEvent was triggered.', async () => {

    testFixtureProvider.executeProcess(processModelId, startEventId, correlationId);
    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelId);

    const userTask = await getWaitingUserTask();

    should.exist(userTask, 'UserTask was not started!');

    // Wait until the TimerBoundaryEvent gets triggered and finishes the ProcessInstance.
    await new Promise((resolve) => {
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(userTask.processInstanceId, resolve);
    });

    // Now see if the UserTask is still listed as active.
    const waitingUserTasks = await testFixtureProvider
      .consumerApiClientService
      .getUserTasksForProcessModelInCorrelation(defaultIdentity, processModelId, correlationId);

    should(waitingUserTasks.userTasks).be.instanceOf(Array);
    should(waitingUserTasks.userTasks.length).be.equal(0);
  });

  async function getWaitingUserTask() {

    const waitingUserTasks =
      await processInstanceHandler.getWaitingUserTasksForCorrelationId(defaultIdentity, correlationId);

    should(waitingUserTasks.userTasks).be.instanceOf(Array);
    should(waitingUserTasks.userTasks.length).be.greaterThan(0);

    const userTask = waitingUserTasks.userTasks[0];

    return userTask;
  }

  async function finishUserTask(userTask) {
    return new Promise((resolve) => {
      // eslint-disable-next-line
      const finishedUserTaskMsg = `/processengine/correlation/${correlationId}/processinstance/${userTask.processInstanceId}/usertask/${userTask.flowNodeInstanceId}/finished`;
      eventAggregator.subscribeOnce(finishedUserTaskMsg, resolve);
      // eslint-disable-next-line
      const finishUserTaskMsg = `/processengine/correlation/${correlationId}/processinstance/${userTask.processInstanceId}/usertask/${userTask.flowNodeInstanceId}/finish`;
      eventAggregator.publish(finishUserTaskMsg, {});
    });
  }

  async function triggerEventsInSequence(userTask, eventToTriggerFirst, eventPayload) {

    return new Promise(async (resolve) => {
      let userTaskWasFinished = false;
      let messageReceived = false;
      let signalReceived = false;
      let timeoutExpired = false;

      // Subscribe to each event that will notify us about a triggered BoundaryEvent, or the finished UserTask.
      const userTaskConfirmationMessage = '/processengine/process/message/AcknowledgeUserTaskFinished';
      const userTaskSubscription = eventAggregator.subscribeOnce(userTaskConfirmationMessage, () => {
        userTaskWasFinished = true;
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
      const finishUserTaskEventName = `/processengine/correlation/${correlationId}/processinstance/${userTask.processInstanceId}/usertask/${userTask.flowNodeInstanceId}/finish`;
      const triggerMessageEventName = '/processengine/process/message/TestMessage1234';
      const triggerSignalEventName = '/processengine/process/signal/TestSignal1234';

      // Now trigger each event and the UserTask.
      eventAggregator.publish(finishUserTaskEventName, {});
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
      eventAggregator.unsubscribe(userTaskSubscription);
      eventAggregator.unsubscribe(messageReceivedSubscription);
      eventAggregator.unsubscribe(signalReceivedSubscription);
      eventAggregator.unsubscribe(timeoutExpiredSubscription);

      return resolve({
        userTaskWasFinished: userTaskWasFinished,
        messageReceived: messageReceived,
        signalReceived: signalReceived,
        timeoutExpired: timeoutExpired,
      });
    });
  }
});
