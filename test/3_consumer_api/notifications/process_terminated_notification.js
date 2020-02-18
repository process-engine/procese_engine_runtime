'use strict';

const should = require('should');
const uuid = require('node-uuid');

const StartCallbackType = require('@process-engine/consumer_api_contracts').DataModels.ProcessModels.StartCallbackType;

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe.only('ConsumerAPI:   Receive ProcessTerminated Notification', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const correlationId = uuid.v4();
  const processModelId = 'test_consumer_api_process_terminate';

  const noopCallback = () => {};

  const processTerminatedMessagePath = 'process_terminated';
  const sampleProcessTerminatedMessage = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'Terminate_End_Event_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleProcessTerminatedMessage.processInstanceOwner = defaultIdentity;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a process is terminated', async () => {

    let notificationReceived = false;

    const messageReceivedCallback = (message) => {
      should.exist(message);
      should(message.correlationId).be.equal(correlationId);
      should(message.flowNodeId).be.equal('EndEvent_1');

      notificationReceived = true;
    };

    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClient
      .onProcessTerminated(defaultIdentity, messageReceivedCallback, subscribeOnce);

    try {
      const returnOn = StartCallbackType.CallbackOnProcessInstanceFinished;

      await testFixtureProvider
        .consumerApiClient
        .startProcessInstance(defaultIdentity, processModelId, {correlationId: correlationId}, returnOn, 'StartEvent_1');
    } catch {} finally { // eslint-disable-line
      should(notificationReceived).be.true('Did not receive the expected notification!');
    }
  });

  it('should fail to subscribe for the ProcessTerminated notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClient
        .onProcessTerminated({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should no longer receive ProcessTerminated notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClient
      .onProcessTerminated(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(processTerminatedMessagePath, sampleProcessTerminatedMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .consumerApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(processTerminatedMessagePath, sampleProcessTerminatedMessage);
    eventAggregator.publish(processTerminatedMessagePath, sampleProcessTerminatedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive ProcessTerminated notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .consumerApiClient
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .consumerApiClient
        .onProcessTerminated(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(processTerminatedMessagePath, sampleProcessTerminatedMessage);
      eventAggregator.publish(processTerminatedMessagePath, sampleProcessTerminatedMessage);
    });
  });

  it('should only receive one ProcessTerminated notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClient
      .onProcessTerminated(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(processTerminatedMessagePath, sampleProcessTerminatedMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(processTerminatedMessagePath, sampleProcessTerminatedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });
});
