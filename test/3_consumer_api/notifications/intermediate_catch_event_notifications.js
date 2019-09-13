const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   Receive global IntermediateCatchEvent Notifications', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_intermediate-catch-event';

  let correlationId;

  let intermediateCatchEventToFinish;

  const noopCallback = () => {};

  const intermediateCatchEventReachedMessagePath = 'intermediate_catch_event_reached';
  const intermediateCatchEventFinishedMessagePath = 'intermediate_catch_event_finished';
  const sampleIntermediateCatchEventMessage = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'IntermediateCatchEvent_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleIntermediateCatchEventMessage.processInstanceOwner = defaultIdentity;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification via socket when an IntermediateCatchEvent is suspended', async () => {

    correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const notificationReceivedCallback = async (intermediateCatchEventReachedMessage) => {

        should.exist(intermediateCatchEventReachedMessage);

        // Store this for use in the second test, where we wait for the intermediateCatchEventFinished notification.
        intermediateCatchEventToFinish = intermediateCatchEventReachedMessage;

        const messageIsAboutCorrectIntermediateCatchEvent =
          intermediateCatchEventReachedMessage.flowNodeId === sampleIntermediateCatchEventMessage.flowNodeId;

        should(messageIsAboutCorrectIntermediateCatchEvent).be.true();

        const processInstanceFinished = (() => {
          resolve();
        });

        processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processInstanceFinished);
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .consumerApiClient
        .onIntermediateCatchEventReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification via socket when an IntermediateCatchEvent is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationReceived = false;

      const notificationReceivedCallback = async (intermediateCatchEventFinishedMessage) => {
        should(intermediateCatchEventFinishedMessage).not.be.undefined();
        should(intermediateCatchEventFinishedMessage.flowNodeId).be.equal(intermediateCatchEventToFinish.flowNodeId);
        should(intermediateCatchEventFinishedMessage.processModelId).be.equal(intermediateCatchEventToFinish.processModelId);
        should(intermediateCatchEventFinishedMessage.correlationId).be.equal(intermediateCatchEventToFinish.correlationId);

        notificationReceived = true;
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .consumerApiClient
        .onIntermediateCatchEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      const processFinishedCallback = () => {

        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the finished IntermediateCatchEvent!');
        }

        resolve();
      };

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);
    });
  });

  it('should fail to subscribe for the IntermediateCatchEventReached notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClient
        .onIntermediateCatchEventReached({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the IntermediateCatchEventFinished notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClient
        .onIntermediateCatchEventFinished({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should no longer receive IntermediateCatchEventReached notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClient
      .onIntermediateCatchEventReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(intermediateCatchEventReachedMessagePath, sampleIntermediateCatchEventMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .consumerApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(intermediateCatchEventReachedMessagePath, sampleIntermediateCatchEventMessage);
    eventAggregator.publish(intermediateCatchEventReachedMessagePath, sampleIntermediateCatchEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should no longer receive IntermediateCatchEventFinished notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClient
      .onIntermediateCatchEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(intermediateCatchEventFinishedMessagePath, sampleIntermediateCatchEventMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .consumerApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(intermediateCatchEventFinishedMessagePath, sampleIntermediateCatchEventMessage);
    eventAggregator.publish(intermediateCatchEventFinishedMessagePath, sampleIntermediateCatchEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive IntermediateCatchEventReached notifications, if subscribeOnce is set to "false"', async () => {

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
        .onIntermediateCatchEventReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(intermediateCatchEventReachedMessagePath, sampleIntermediateCatchEventMessage);
      eventAggregator.publish(intermediateCatchEventReachedMessagePath, sampleIntermediateCatchEventMessage);
    });
  });

  it('should continuously receive IntermediateCatchEventFinished notifications, if subscribeOnce is set to "false"', async () => {

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
        .onIntermediateCatchEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(intermediateCatchEventFinishedMessagePath, sampleIntermediateCatchEventMessage);
      eventAggregator.publish(intermediateCatchEventFinishedMessagePath, sampleIntermediateCatchEventMessage);
    });
  });

  it('should only receive one IntermediateCatchEventReached notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClient
      .onIntermediateCatchEventReached(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(intermediateCatchEventReachedMessagePath, sampleIntermediateCatchEventMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(intermediateCatchEventReachedMessagePath, sampleIntermediateCatchEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one IntermediateCatchEventFinished notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClient
      .onIntermediateCatchEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(intermediateCatchEventFinishedMessagePath, sampleIntermediateCatchEventMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(intermediateCatchEventFinishedMessagePath, sampleIntermediateCatchEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });
});
