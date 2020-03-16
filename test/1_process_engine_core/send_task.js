'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Send Task - ', () => {

  let processInstanceHandler;
  let testFixtureProvider;

  const processModelSendTask = 'send_task_throw_test';
  const processModelSendTaskAbort = 'send_task_max_retry_test';
  const processModelReceiveTask = 'receive_task_wait_test';

  let eventAggregator;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([
      processModelSendTask,
      processModelSendTaskAbort,
      processModelReceiveTask,
    ]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('Should continue Process B with a ReceiveTask, after Process A passed a corresponding SendTask.', async () => {
    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_1';
    testFixtureProvider.executeProcess(processModelReceiveTask, 'StartEvent_1', correlationId);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelReceiveTask);

    return new Promise((resolve) => {

      const endMessageReceiveTaskProcess = `/processengine/correlation/${correlationId}/processmodel/${processModelReceiveTask}/ended`;
      const receiveTaskProcessFinishedCallback = (message) => {
        const expectedEndEventReached = message.flowNodeId === endEventToWaitFor;
        if (expectedEndEventReached) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.eql('Message Received');

          resolve();
        }
      };

      eventAggregator.subscribeOnce(endMessageReceiveTaskProcess, receiveTaskProcessFinishedCallback);

      testFixtureProvider.executeProcess(processModelSendTask, 'StartEvent_1', correlationId);
    });
  });

  it('Should be able to continue a Process with a SendTask, after a ReceiveTask acknowledges receit of the message', async () => {
    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_1';
    testFixtureProvider.executeProcess(processModelSendTask, 'StartEvent_1', correlationId);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelSendTask);

    return new Promise((resolve) => {

      const endMessageSendTaskProcess = `/processengine/correlation/${correlationId}/processmodel/${processModelSendTask}/ended`;
      const sendTaskProcessFinishedCallback = (message) => {
        const expectedEndEventReached = message.flowNodeId === endEventToWaitFor;
        if (expectedEndEventReached) {
          resolve();
        }
      };

      eventAggregator.subscribeOnce(endMessageSendTaskProcess, sendTaskProcessFinishedCallback);

      testFixtureProvider.executeProcess(processModelReceiveTask, 'StartEvent_1', correlationId);
    });
  });

  it('Should throw an error, if the SendTask does not receive a response within the configured timeframe', async () => {
    try {
      await testFixtureProvider.executeProcess(processModelSendTaskAbort);
    } catch (error) {
      should(error.message).match(/did not receive a response/i);
      should(error.code).be.equal(408);
    }
  });

});
