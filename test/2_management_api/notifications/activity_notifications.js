

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   Receive global Activity Notifications', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_callactivity';
  const callActivityTargetProcessModelId = 'test_management_api_callactivity_target';

  let correlationId;

  let activityToFinish;

  const noopCallback = () => {};

  const activityWaitingMessagePath = 'activity_reached';
  const activityFinishedMessagePath = 'activity_finished';
  const sampleActivityMessage = {
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

    sampleActivityMessage.processInstanceOwner = defaultIdentity;

    const processModelsToImport = [processModelId, callActivityTargetProcessModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification via socket when an Activity is reached', async () => {

    correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const notificationReceivedCallback = async (activityWaitingMessage) => {

        should.exist(activityWaitingMessage);

        // Store this for use in the second test, where we wait for the ActivityFinished notification.
        activityToFinish = activityWaitingMessage;

        const messageIsAboutCorrectActivity = activityWaitingMessage.flowNodeId === sampleActivityMessage.flowNodeId;

        should(messageIsAboutCorrectActivity).be.true();

        resolve();
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClientService
        .onActivityReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification via socket when an Activity is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationReceived = false;

      const notificationReceivedCallback = async (activityFinishedMessage) => {
        should(activityFinishedMessage).not.be.undefined();
        should(activityFinishedMessage.flowNodeId).be.equal(activityToFinish.flowNodeId);
        should(activityFinishedMessage.processModelId).be.equal(activityToFinish.processModelId);
        should(activityFinishedMessage.correlationId).be.equal(activityToFinish.correlationId);
        notificationReceived = true;
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClientService
        .onActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      const processFinishedCallback = () => {
        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the finished Activity!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);
    });
  });

  it('should fail to subscribe for the ActivityReached notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onActivityReached({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the ActivityFinished notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onActivityFinished({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should no longer receive ActivityReached notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClientService
      .onActivityReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(activityWaitingMessagePath, sampleActivityMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(activityWaitingMessagePath, sampleActivityMessage);
    eventAggregator.publish(activityWaitingMessagePath, sampleActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should no longer receive ActivityFinished notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClientService
      .onActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(activityFinishedMessagePath, sampleActivityMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(activityFinishedMessagePath, sampleActivityMessage);
    eventAggregator.publish(activityFinishedMessagePath, sampleActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive ActivityReached notifications, if subscribeOnce is set to "false"', async () => {

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
        .onActivityReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(activityWaitingMessagePath, sampleActivityMessage);
      eventAggregator.publish(activityWaitingMessagePath, sampleActivityMessage);
    });
  });

  it('should continuously receive ActivityFinished notifications, if subscribeOnce is set to "false"', async () => {

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
        .onActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(activityFinishedMessagePath, sampleActivityMessage);
      eventAggregator.publish(activityFinishedMessagePath, sampleActivityMessage);
    });
  });

  it('should only receive one ActivityReached notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClientService
      .onActivityReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(activityWaitingMessagePath, sampleActivityMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(activityWaitingMessagePath, sampleActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one ActivityFinished notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClientService
      .onActivityFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(activityFinishedMessagePath, sampleActivityMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(activityFinishedMessagePath, sampleActivityMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });
});
