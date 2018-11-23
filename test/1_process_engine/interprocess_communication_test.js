'use strict';

const should = require('should');
const uuid = require('uuid');
const TestFixtureProvider = require('../../dist/commonjs').TestFixtureProvider;
const ProcessInstanceHandler = require('../../dist/commonjs').ProcessInstanceHandler;

describe('Inter-process communication - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  const processModelSendEvents = 'end_event_tests';
  const processModelReceiveEvents = 'start_event_tests';

  const processModelSendTask = 'send_task_throw_test';
  const processModelReceiveTask = 'receive_task_wait_test';

  let eventAggregator;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([
      processModelSendEvents,
      processModelReceiveEvents,
      processModelSendTask,
      processModelReceiveTask,
    ]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

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

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelReceiveEvents);

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

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelReceiveEvents);

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

  it('should execute two processes with a send- and a receive task.', async () => {
    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_1';
    testFixtureProvider.executeProcess(processModelReceiveTask, 'StartEvent_1', correlationId);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelReceiveTask);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelReceiveTask}/ended`;
      const evaluationCallback = (message) => {
        if (message.flowNodeId === endEventToWaitFor) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.eql('Message Received');
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the signal.
      testFixtureProvider.executeProcess(processModelSendTask, 'StartEvent_1', correlationId);
    });
  });

});
