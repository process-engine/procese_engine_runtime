'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   Receive global CallActivity Notifications', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_callactivity';
  const callActivityTargetProcessModelId = 'test_management_api_callactivity_target';

  let correlationId;

  let callActivityToFinish;

  const noopCallback = () => {};

  const callActivityWaitingMessagePath = 'call_activity_reached';
  const callActivityFinishedMessagePath = 'call_activity_finished';
  const sampleCallActivityMessage = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'CallActivity_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleCallActivityMessage.processInstanceOwner = defaultIdentity;

    const processModelsToImport = [processModelId, callActivityTargetProcessModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification via socket when CallActivity is suspended', async () => {

    correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const notificationReceivedCallback = async (callActivityWaitingMessage) => {

        should.exist(callActivityWaitingMessage);

        // Store this for use in the second test, where we wait for the callActivityFinished notification.
        callActivityToFinish = callActivityWaitingMessage;

        const messageIsAboutCorrectCallActivity = callActivityWaitingMessage.flowNodeId === sampleCallActivityMessage.flowNodeId;

        should(messageIsAboutCorrectCallActivity).be.true();

        resolve();
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClientService
        .onCallActivityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification via socket when a CallActivity is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationReceived = false;

      const notificationReceivedCallback = async (callActivityFinishedMessage) => {
        should(callActivityFinishedMessage).not.be.undefined();
        should(callActivityFinishedMessage.flowNodeId).be.equal(callActivityToFinish.flowNodeId);
        should(callActivityFinishedMessage.processModelId).be.equal(callActivityToFinish.processModelId);
        should(callActivityFinishedMessage.correlationId).be.equal(callActivityToFinish.correlationId);
        notificationReceived = true;
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClientService
        .onCallActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      const processFinishedCallback = () => {
        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the finished CallActivity!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);
    });
  });

  it('should fail to subscribe for the CallActivityWaiting notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onCallActivityWaiting({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the CallActivityFinished notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onCallActivityFinished({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should no longer receive CallActivityWaiting notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClientService
      .onCallActivityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(callActivityWaitingMessagePath, sampleCallActivityMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(callActivityWaitingMessagePath, sampleCallActivityMessage);
    eventAggregator.publish(callActivityWaitingMessagePath, sampleCallActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should no longer receive CallActivityFinished notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClientService
      .onCallActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(callActivityFinishedMessagePath, sampleCallActivityMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(callActivityFinishedMessagePath, sampleCallActivityMessage);
    eventAggregator.publish(callActivityFinishedMessagePath, sampleCallActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive CallActivityWaiting notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .managementApiClientService
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onCallActivityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(callActivityWaitingMessagePath, sampleCallActivityMessage);
      eventAggregator.publish(callActivityWaitingMessagePath, sampleCallActivityMessage);
    });
  });

  it('should continuously receive CallActivityFinished notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .managementApiClientService
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onCallActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(callActivityFinishedMessagePath, sampleCallActivityMessage);
      eventAggregator.publish(callActivityFinishedMessagePath, sampleCallActivityMessage);
    });
  });

  it('should only receive one CallActivityWaiting notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClientService
      .onCallActivityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(callActivityWaitingMessagePath, sampleCallActivityMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(callActivityWaitingMessagePath, sampleCallActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one CallActivityFinished notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClientService
      .onCallActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(callActivityFinishedMessagePath, sampleCallActivityMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(callActivityFinishedMessagePath, sampleCallActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });
});
