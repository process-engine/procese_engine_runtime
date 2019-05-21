'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   Receive identity specific EmptyActivity Notifications', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_emptyactivity';
  let correlationId;
  let emptyActivityToFinish;

  const noopCallback = () => {};

  const emptyActivityWaitingMessagePath = 'empty_activity_reached';
  const emptyActivityFinishedMessagePath = 'empty_activity_finished';
  const sampleEmptyActivityMessage = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'Empty_Activity_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };
  const sampleEmptyActivityMessageForDifferentUser = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'Empty_Activity_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleEmptyActivityMessage.processInstanceOwner = defaultIdentity;
    sampleEmptyActivityMessageForDifferentUser.processInstanceOwner = testFixtureProvider.identities.restrictedUser;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification via socket when a EmptyActivity for the given identity is suspended', async () => {

    correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const notificationReceivedCallback = async (emptyActivityWaitingMessage) => {

        should.exist(emptyActivityWaitingMessage);
        // Store this for use in the second test, where we wait for the emptyActivityFinished notification.
        emptyActivityToFinish = emptyActivityWaitingMessage;

        const emptyActivityList = await testFixtureProvider
          .consumerApiClientService
          .getEmptyActivitiesForProcessModel(defaultIdentity, processModelId);

        const listContainsEmptyActivityIdFromMessage = emptyActivityList.emptyActivities.some((emptyActivity) => {
          return emptyActivity.id === emptyActivityWaitingMessage.flowNodeId;
        });

        should(listContainsEmptyActivityIdFromMessage).be.true();

        resolve();
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .consumerApiClientService
        .onEmptyActivityForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification via socket when a EmptyActivity for the given identity is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationReceived = false;

      const notificationReceivedCallback = async (emptyActivityFinishedMessage) => {
        should(emptyActivityFinishedMessage).not.be.undefined();
        should(emptyActivityFinishedMessage.flowNodeId).be.equal(emptyActivityToFinish.flowNodeId);
        should(emptyActivityFinishedMessage.processModelId).be.equal(emptyActivityToFinish.processModelId);
        should(emptyActivityFinishedMessage.correlationId).be.equal(emptyActivityToFinish.correlationId);
        notificationReceived = true;
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .consumerApiClientService
        .onEmptyActivityForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      const processFinishedCallback = () => {
        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the finished EmptyActivity!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessWithInstanceIdToEnd(emptyActivityToFinish.processInstanceId, processFinishedCallback);
      finishWaitingEmptyActivity();
    });
  });

  it('should fail to subscribe for the EmptyActivityForIdentityWaiting notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onEmptyActivityForIdentityWaiting({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the EmptyActivityForIdentityFinished notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onEmptyActivityForIdentityFinished({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.equal(expectedErrorCode);
    }
  });

  it('should no longer receive EmptyActivityWaiting notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClientService
      .onEmptyActivityForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .consumerApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);
    eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should no longer receive EmptyActivityFinished notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClientService
      .onEmptyActivityForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .consumerApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);
    eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive EmptyActivityWaiting notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .consumerApiClientService
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onEmptyActivityForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);
      eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);
    });
  });

  it('should continuously receive EmptyActivityFinished notifications, if subscribeOnce is set to "false"', async () => {

    return new Promise(async (resolve, reject) => {
      let receivedNotifications = 0;

      const notificationReceivedCallback = async (message) => {
        receivedNotifications++;

        // If it is confirmed that this subscription is still active
        // after receiving multiple events, this test was successful.
        if (receivedNotifications === 2) {
          await testFixtureProvider
            .consumerApiClientService
            .removeSubscription(defaultIdentity, subscription);

          resolve();
        }
      };

      // Create the subscription
      const subscribeOnce = false;
      const subscription = await testFixtureProvider
        .consumerApiClientService
        .onEmptyActivityForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);
      eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);
    });
  });

  it('should only receive EmptyActivityWaiting notifications about the users own EmptyActivities', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClientService
      .onEmptyActivityForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);
    eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessageForDifferentUser);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the notifications are received.
    await processInstanceHandler.wait(500);

    await testFixtureProvider
      .consumerApiClientService
      .removeSubscription(defaultIdentity, subscription);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive EmptyActivityFinished notifications about the users own EmptyActivities', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClientService
      .onEmptyActivityForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);
    eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessageForDifferentUser);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the notifications are received.
    await processInstanceHandler.wait(500);

    await testFixtureProvider
      .consumerApiClientService
      .removeSubscription(defaultIdentity, subscription);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one EmptyActivityWaiting notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClientService
      .onEmptyActivityForIdentityWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(emptyActivityWaitingMessagePath, sampleEmptyActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one EmptyActivityFinished notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClientService
      .onEmptyActivityForIdentityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(emptyActivityFinishedMessagePath, sampleEmptyActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  async function finishWaitingEmptyActivity() {

    const processInstanceId = emptyActivityToFinish.processInstanceId;
    const emptyActivityInstanceId = emptyActivityToFinish.flowNodeInstanceId;

    await testFixtureProvider
      .consumerApiClientService
      .finishEmptyActivity(defaultIdentity, processInstanceId, emptyActivityToFinish.correlationId, emptyActivityInstanceId);
  }
});
