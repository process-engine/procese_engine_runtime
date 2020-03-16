'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../dist/commonjs/test_setup');

describe('Inter-process communication - ', () => {

  let autoStartService;
  let processInstanceHandler;
  let testFixtureProvider;

  const processModelEndEventTests = 'end_event_tests';
  const processModelStartEventTests = 'start_event_tests';
  const processModelIntermediateCatchEventTests = 'intermediate_event_receive_tests';
  const processModelIntermediateThrowEventTests = 'intermediate_event_send_tests';

  let eventAggregator;

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();

    await testFixtureProvider.importProcessFiles([
      processModelEndEventTests,
      processModelStartEventTests,
      processModelIntermediateCatchEventTests,
      processModelIntermediateThrowEventTests,
    ]);

    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);

    autoStartService = await testFixtureProvider.resolveAsync('AutoStartService');
    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');

    await autoStartService.start();
  });

  after(async () => {
    await autoStartService.stop();
    await testFixtureProvider.tearDown();
  });

  it('should start process B with MessageStartEvent, after process A finished with a MessageEndEvent', async () => {

    const correlationId = uuid.v4();

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelStartEventTests}/ended`;
      const evaluationCallback = (message) => {

        const endEventToWaitFor = 'EndEvent_MessageTest';
        if (message.flowNodeId === endEventToWaitFor) {
          const expectedResult = /message received/i;
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the message.
      testFixtureProvider.executeProcess(processModelEndEventTests, 'StartEvent_MessageTest', correlationId);
    });
  });

  it('should start process B with SignalStartEvent, after process A finished with a SignalEndEvent', async () => {

    const correlationId = uuid.v4();

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelStartEventTests}/ended`;
      const evaluationCallback = (message) => {

        const endEventToWaitFor = 'EndEvent_SignalTest';
        if (message.flowNodeId === endEventToWaitFor) {
          const expectedResult = /signal received/i;
          should(message).have.property('currentToken');
          should(message.currentToken).be.match(expectedResult);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the signal.
      testFixtureProvider.executeProcess(processModelEndEventTests, 'StartEvent_SignalTest', correlationId);
    });
  });

  it('should continue process B with MessageCatchEvent, after process A passed a corresponding MessageThrowEvent', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_MessageReceived';

    const initialPayload = {
      mode: 'default',
      message: 'message triggered',
    };

    // We can't await the process execution here, because that would prevent us from starting the second process.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelIntermediateCatchEventTests, 'StartEvent_MessageTest', correlationId);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelIntermediateCatchEventTests);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelIntermediateCatchEventTests}/ended`;
      const evaluationCallback = (message) => {
        const isExpectedEndEvent = message.flowNodeId === endEventToWaitFor;
        if (isExpectedEndEvent) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.eql(initialPayload);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the message.
      testFixtureProvider.executeProcess(processModelIntermediateThrowEventTests, 'StartEvent_SendMessage', correlationId, initialPayload);
    });
  });

  it('should continue process B with SignalCatchEvent, after process A passed a corresponding SignalThrowEvent', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_SignalReceived';

    const initialPayload = {
      mode: 'default',
      signal: 'signal triggered',
    };

    // We can't await the process execution here, because that would prevent us from starting the second process.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelIntermediateCatchEventTests, 'StartEvent_SignalTest', correlationId);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelIntermediateCatchEventTests);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelIntermediateCatchEventTests}/ended`;
      const evaluationCallback = (message) => {
        const isExpectedEndEvent = message.flowNodeId === endEventToWaitFor;
        if (isExpectedEndEvent) {
          should(message).have.property('currentToken');
          should(message.currentToken).be.eql(initialPayload);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the signal.
      testFixtureProvider.executeProcess(processModelIntermediateThrowEventTests, 'StartEvent_SendSignal', correlationId, initialPayload);
    });
  });

  it('should correctly use a customized payload with a MessageThrowEvent', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_MessageReceived';

    const initialPayload = {
      mode: 'custom',
      message: 'message triggered',
    };

    // We can't await the process execution here, because that would prevent us from starting the second process.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelIntermediateCatchEventTests, 'StartEvent_MessageTest', correlationId);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelIntermediateCatchEventTests);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelIntermediateCatchEventTests}/ended`;
      const evaluationCallback = (message) => {
        const isExpectedEndEvent = message.flowNodeId === endEventToWaitFor;
        if (isExpectedEndEvent) {
          should(message).have.property('currentToken');
          should(message.currentToken.testWrapper).be.eql(initialPayload.message);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the message.
      testFixtureProvider.executeProcess(processModelIntermediateThrowEventTests, 'StartEvent_SendMessage', correlationId, initialPayload);
    });
  });

  it('should correctly use a customized payload with a SignalThrowEvent', async () => {

    const correlationId = uuid.v4();
    const endEventToWaitFor = 'EndEvent_SignalReceived';

    const initialPayload = {
      mode: 'custom',
      signal: 'signal triggered',
    };

    // We can't await the process execution here, because that would prevent us from starting the second process.
    // As a result we must subscribe to the event that gets send when the test is done.
    testFixtureProvider.executeProcess(processModelIntermediateCatchEventTests, 'StartEvent_SignalTest', correlationId);

    await processInstanceHandler.waitForProcessInstanceToReachSuspendedTask(correlationId, processModelIntermediateCatchEventTests);

    return new Promise((resolve) => {

      const endMessageToWaitFor = `/processengine/correlation/${correlationId}/processmodel/${processModelIntermediateCatchEventTests}/ended`;
      const evaluationCallback = (message) => {
        const isExpectedEndEvent = message.flowNodeId === endEventToWaitFor;
        if (isExpectedEndEvent) {
          should(message).have.property('currentToken');
          should(message.currentToken.testWrapper).be.eql(initialPayload.signal);
          resolve();
        }
      };

      // Subscribe for the EndEvent
      eventAggregator.subscribeOnce(endMessageToWaitFor, evaluationCallback);

      // Run the process that is supposed to publish the signal.
      testFixtureProvider.executeProcess(processModelIntermediateThrowEventTests, 'StartEvent_SendSignal', correlationId, initialPayload);
    });
  });

});
