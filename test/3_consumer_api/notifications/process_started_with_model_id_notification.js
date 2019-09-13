'use strict';

const should = require('should');
const uuid = require('node-uuid');

const {TestFixtureProvider, ProcessInstanceHandler} = require('../../../dist/commonjs/test_setup');

describe('Consumer API:   Receive ProcessWithProcessModelIdStarted Notifications', () => {

  let eventAggregator;
  let processInstanceHandler;
  let testFixtureProvider;

  let defaultIdentity;

  const processModelId = 'test_consumer_api_process_start';

  const noopCallback = () => {};

  const sampleProcessStartedMessage = {
    correlationId: uuid.v4(),
    processModelId: processModelId,
    processInstanceId: uuid.v4(),
    flowNodeId: 'Start_Event_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };
  const sampleProcessStartedMessage2 = {
    correlationId: uuid.v4(),
    processModelId: 'anotherProcessModelId',
    processInstanceId: uuid.v4(),
    flowNodeId: 'Start_Event_1',
    flowNodeInstanceId: uuid.v4(),
    processInstanceOwner: undefined, // Can only be set after the TestFixtureProvider was initialized.
    payload: {},
  };

  const processStartedMessagePath = 'process_started';

  before(async () => {
    testFixtureProvider = new TestFixtureProvider();
    await testFixtureProvider.initializeAndStart();
    defaultIdentity = testFixtureProvider.identities.defaultUser;

    sampleProcessStartedMessage.processInstanceOwner = defaultIdentity;
    sampleProcessStartedMessage2.processInstanceOwner = testFixtureProvider.identities.restrictedUser;

    const processModelsToImport = [processModelId];
    await testFixtureProvider.importProcessFiles(processModelsToImport);

    eventAggregator = await testFixtureProvider.resolveAsync('EventAggregator');
    processInstanceHandler = new ProcessInstanceHandler(testFixtureProvider);
  });

  after(async () => {
    await testFixtureProvider.tearDown();
  });

  it('should send a notification when a process with a given ProcessModelId was started', async () => {

    return new Promise(async (resolve, reject) => {

      const correlationId = uuid.v4();
      let notificationReceived = false;

      const notificationReceivedCallback = (processStartedMessage) => {
        should.exist(processStartedMessage);
        should(processStartedMessage).have.property('correlationId');

        const messageWasNotFromSpecifiedCorrelation = processStartedMessage.correlationId !== correlationId;
        if (messageWasNotFromSpecifiedCorrelation) {
          return;
        }

        const expectedStartEventId = 'StartEvent_1';

        should(processStartedMessage.correlationId).be.equal(correlationId);
        should(processStartedMessage).have.property('flowNodeId');
        should(processStartedMessage.flowNodeId).be.equal(expectedStartEventId);
        notificationReceived = true;
      };

      const subscribeOnce = false;
      const notificationSubscription = await testFixtureProvider
        .consumerApiClient
        .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId, subscribeOnce);

      // We must await the end of the ProcessInstance to avoid messed up entries in the database.
      const processFinishedCallback = async () => {
        await testFixtureProvider
          .consumerApiClient
          .removeSubscription(defaultIdentity, notificationSubscription);

        if (!notificationReceived) {
          throw new Error('Did not receive the expected notification about the started ProcessInstance!');
        }
        resolve();
      };
      processInstanceHandler.waitForProcessInstanceToEnd(correlationId, processModelId, processFinishedCallback);

      await processInstanceHandler.startProcessInstanceAndReturnCorrelationId(processModelId, correlationId);
    });
  });

  it('should fail to subscribe for the ProcessWithProcessModelIdStarted notification, if the user is unauthorized', async () => {
    try {
      const subscribeOnce = true;
      const subscription = await testFixtureProvider
        .consumerApiClient
        .onProcessWithProcessModelIdStarted({}, noopCallback, processModelId, subscribeOnce);
      should.fail(subscription, undefined, 'This should not have been possible, because the user is unauthorized!');
    } catch (error) {
      const expectedErrorMessage = /no auth token/i;
      const expectedErrorCode = 401;
      should(error.message).be.match(expectedErrorMessage);
      should(error.code).be.match(expectedErrorCode);
    }
  });

  it('should no longer receive ProcessStarted notifications, after the subscription was removed', async () => {

    let receivedNotifications = 0;

    const notificationReceivedCallback = (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClient
      .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId, subscribeOnce);

    // Publish the first notification
    eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    // Remove the subscription
    await testFixtureProvider
      .consumerApiClient
      .removeSubscription(defaultIdentity, subscription);

    // Publish more events
    eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);
    eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should continuously receive ProcessStarted notifications, if subscribeOnce is set to "false"', async () => {

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
        .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId, subscribeOnce);

      // Publish a number of events
      eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);
      eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);
    });
  });

  it('should only receive notifications for those ProcessModels with a matching ProcessModelId', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = false;
    const subscription = await testFixtureProvider
      .consumerApiClient
      .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId, subscribeOnce);

    // Publish a number of events for various process models
    eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);
    eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage2);

    // Wait some time before removing the subscription, or we risk it being destroyed
    // before the notifications are received.
    await processInstanceHandler.wait(500);

    await testFixtureProvider
      .consumerApiClient
      .removeSubscription(defaultIdentity, subscription);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });

  it('should only receive one ProcessStarted notification, if subscribeOnce is set to "true"', async () => {
    let receivedNotifications = 0;

    const notificationReceivedCallback = (message) => {
      receivedNotifications++;
    };

    // Create the subscription
    const subscribeOnce = true;
    await testFixtureProvider
      .consumerApiClient
      .onProcessWithProcessModelIdStarted(defaultIdentity, notificationReceivedCallback, processModelId, subscribeOnce);

    // Publish a number of events
    eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);

    // Wait some time before publishing another event, or we risk the subscription being removed
    // before the first notification is received.
    await processInstanceHandler.wait(500);

    eventAggregator.publish(processStartedMessagePath, sampleProcessStartedMessage);

    const expectedReceivedAmountOfNotifications = 1;
    should(receivedNotifications).be.equal(expectedReceivedAmountOfNotifications);
  });
});
