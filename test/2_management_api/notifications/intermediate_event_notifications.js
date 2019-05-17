'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {ProcessInstanceHandler, TestFixtureProvider} = require('../../../dist/commonjs/test_setup');

describe('Management API:   Receive global IntermediateEvent Notifications', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_management_api_intermediateevent';

  let correlationId;

  let intermediateEventToFinish;

  const noopCallback = () => {};

  const intermediateEventWaitingMessagePath = 'intermediate_event_reached';
  const intermediateEventFinishedMessagePath = 'intermediate_event_finished';
  const sampleIntermediateEventMessage = {
    correlationId: uuid.v4(),
    processModelId: 'processModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'IntermediateEvent_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleIntermediateEventMessage.processInstanceOwner = defaultIdentity;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification via socket when IntermediateEvent is suspended', async () => {

    correlationId = uuid.v4();

    return new Promise(async (resolve, reject) => {

      const notificationReceivedCallback = async (intermediateEventWaitingMessage) => {

        should.exist(intermediateEventWaitingMessage);

        // Store this for use in the second test, where we wait for the intermediateEventFinished notification.
        intermediateEventToFinish = intermediateEventWaitingMessage;

        const messageIsAboutCorrectIntermediateEvent = intermediateEventWaitingMessage.flowNodeId === sampleIntermediateEventMessage.flowNodeId;

        should(messageIsAboutCorrectIntermediateEvent).be.true();

        const processInstanceFinished = (() => {
          resolve();
        });

        processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processInstanceFinished);
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClientService
        .onIntermediateEventWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should send a notification via socket when a IntermediateEvent is finished', async () => {

    return new Promise(async (resolve, reject) => {

      let notificationReceived = false;

      const notificationReceivedCallback = async (intermediateEventFinishedMessage) => {
        should(intermediateEventFinishedMessage).not.be.undefined();
        should(intermediateEventFinishedMessage.flowNodeId).be.equal(intermediateEventToFinish.flowNodeId);
        should(intermediateEventFinishedMessage.processModelId).be.equal(intermediateEventToFinish.processModelId);
        should(intermediateEventFinishedMessage.correlationId).be.equal(intermediateEventToFinish.correlationId);

        notificationReceived = true;
      };

      const subscribeOnce = true;
      await testFixtureProvider
        .managementApiClientService
        .onIntermediateEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      const processFinishedCallback = () => {

        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the finished IntermediateEvent!');
        }

        resolve();
      };

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);
    });
  });

  it('should fail to subscribe for the IntermediateEventWaiting notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onIntermediateEventWaiting({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should fail to subscribe for the IntermediateEventFinished notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .managementApiClientService
        .onIntermediateEventFinished({}, noopCallback, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should no longer receive IntermediateyEventWaiting notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClientService
      .onIntermediateEventWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(intermediateEventWaitingMessagePath, sampleIntermediateEventMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(intermediateEventWaitingMessagePath, sampleIntermediateEventMessage);
    eventAggregator.publish(intermediateEventWaitingMessagePath, sampleIntermediateEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should no longer receive IntermediateEventFinished notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .managementApiClientService
      .onIntermediateEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(intermediateEventFinishedMessagePath, sampleIntermediateEventMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .managementApiClientService
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(intermediateEventFinishedMessagePath, sampleIntermediateEventMessage);
    eventAggregator.publish(intermediateEventFinishedMessagePath, sampleIntermediateEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive IntermediateEventWaiting notifications, if subscribeOnce is set to "false"', async () => {

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
        .onIntermediateEventWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(intermediateEventWaitingMessagePath, sampleIntermediateEventMessage);
      eventAggregator.publish(intermediateEventWaitingMessagePath, sampleIntermediateEventMessage);
    });
  });

  it('should continuously receive IntermediateEventFinished notifications, if subscribeOnce is set to "false"', async () => {

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
        .onIntermediateEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(intermediateEventFinishedMessagePath, sampleIntermediateEventMessage);
      eventAggregator.publish(intermediateEventFinishedMessagePath, sampleIntermediateEventMessage);
    });
  });

  it('should only receive one IntermediateEventWaiting notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClientService
      .onIntermediateEventWaiting(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(intermediateEventWaitingMessagePath, sampleIntermediateEventMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(intermediateEventWaitingMessagePath, sampleIntermediateEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one IntermediateEventFinished notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = async (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .managementApiClientService
      .onIntermediateEventFinished(defaultIdentity, notificationReceivedCallback, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(intermediateEventFinishedMessagePath, sampleIntermediateEventMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(intermediateEventFinishedMessagePath, sampleIntermediateEventMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });
});
